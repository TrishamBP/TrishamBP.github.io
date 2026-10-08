"""A minimal client/server split: the harness runs in a server, UIs are clients.

Paper observation (§14.1, Table 12): OpenCode embeds an HTTP server and every
UI - TUI, web, IDE, CI - is a client; token-granular parts are persisted and
re-served over SSE "so every client replays the same stream". Its loop treats
the persisted log as the work queue, which makes it resumable.

Reference implementation proposed in the article (stdlib only, polling
instead of SSE to keep it short):

    POST /sessions                  {"task": "..."}         -> {"session_id": ...}
    GET  /sessions/<id>/events?after=N                    -> {"events": [...], "done": bool}

Clients never talk to the loop; they read the same event log the loop writes.
Bind to localhost only - this server has no authentication.
"""

from __future__ import annotations

import asyncio
import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Callable
from urllib.parse import parse_qs, urlparse

from ..app import Harness


class HarnessServer:
    def __init__(self, factory: Callable[[], Harness], host: str = "127.0.0.1", port: int = 0):
        self.factory = factory
        self.sessions: dict[str, tuple[Harness, threading.Event]] = {}
        server = self

        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *a: Any) -> None:  # quiet
                pass

            def _send(self, code: int, body: dict[str, Any]) -> None:
                data = json.dumps(body).encode()
                self.send_response(code)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)

            def do_POST(self) -> None:
                if self.path != "/sessions":
                    return self._send(404, {"error": "not found"})
                body = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))) or b"{}")
                sid = server.start(body["task"])
                self._send(201, {"session_id": sid})

            def do_GET(self) -> None:
                url = urlparse(self.path)
                parts = url.path.strip("/").split("/")
                if len(parts) != 3 or parts[0] != "sessions" or parts[2] != "events" or parts[1] not in server.sessions:
                    return self._send(404, {"error": "not found"})
                after = int(parse_qs(url.query).get("after", ["0"])[0])
                harness, done = server.sessions[parts[1]]
                events = [{"id": e.id, "kind": e.kind.value, "payload": e.payload}
                          for e in harness.session.log.all_events() if e.id > after]
                self._send(200, {"events": events, "done": done.is_set()})

        self.httpd = ThreadingHTTPServer((host, port), Handler)

    @property
    def port(self) -> int:
        return self.httpd.server_address[1]

    def start(self, task: str) -> str:
        harness = self.factory()
        done = threading.Event()
        self.sessions[harness.session.id] = (harness, done)

        def run() -> None:
            try:
                asyncio.run(harness.run(task))
            finally:
                done.set()

        threading.Thread(target=run, daemon=True).start()
        return harness.session.id

    def serve_in_background(self) -> threading.Thread:
        t = threading.Thread(target=self.httpd.serve_forever, daemon=True)
        t.start()
        return t

    def shutdown(self) -> None:
        self.httpd.shutdown()
        self.httpd.server_close()


if __name__ == "__main__":  # pragma: no cover
    import sys

    from ..app import build_harness
    from ..llm.anthropic_provider import AnthropicModel

    ws = Path(sys.argv[1] if len(sys.argv) > 1 else ".")
    srv = HarnessServer(lambda: build_harness(ws, AnthropicModel()), port=8765)
    print(f"harness server on http://127.0.0.1:{srv.port}")
    srv.httpd.serve_forever()
