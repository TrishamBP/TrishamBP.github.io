"""Process execution with hygiene - and an honest label.

`CommandRunner` is NOT a security boundary. It runs a single program via
exec (never a shell), confines the working directory to the workspace,
scrubs credential-looking environment variables, and enforces a timeout and
an output cap. That is process hygiene.

Paper context (§8.5, §10.8): Codex and Gemini CLI ship OS sandboxes
(Bubblewrap on Linux, Seatbelt on macOS, restricted tokens on Windows);
Gemini CLI scrubs env vars matching TOKEN/SECRET/KEY/AUTH/CREDENTIAL before
each command; Pi deliberately ships no in-process sandbox because a partial
one "would be easy to misunderstand as a security boundary". We take Pi's
warning seriously: for untrusted workloads, wrap argv with an OS sandbox
(see `bubblewrap_argv`) or run the whole harness in a container/VM.
"""

from __future__ import annotations

import asyncio
import os
import re
import shutil
from dataclasses import dataclass
from pathlib import Path

SCRUB = re.compile(r"(TOKEN|SECRET|KEY|AUTH|CREDENTIAL|PASSWORD)", re.IGNORECASE)


@dataclass(frozen=True)
class RunResult:
    exit_code: int
    stdout: str
    stderr: str
    timed_out: bool = False

    def render(self) -> str:
        status = "timed out" if self.timed_out else f"exit={self.exit_code}"
        return f"{status}\nstdout:\n{self.stdout}\nstderr:\n{self.stderr}"


def scrubbed_env() -> dict[str, str]:
    return {k: v for k, v in os.environ.items() if not SCRUB.search(k)}


def bubblewrap_argv(argv: list[str], workspace: Path) -> list[str]:
    """OS-level isolation wrapper for Linux (the flags the paper lists for Codex):
    read-only root, writable workspace, no network, fresh user/PID namespaces.
    Proposed helper; only the argv construction is unit-tested here.
    """
    ws = str(workspace)
    return [
        "bwrap", "--ro-bind", "/", "/", "--bind", ws, ws, "--dev", "/dev", "--proc", "/proc",
        "--unshare-net", "--unshare-user", "--unshare-pid", "--die-with-parent", "--chdir", ws, "--",
        *argv,
    ]


class CommandRunner:
    def __init__(self, workspace: Path, timeout_s: float = 60.0, max_output: int = 20_000,
                 use_bubblewrap: bool = False):
        self.workspace = workspace.resolve()
        self.timeout_s = timeout_s
        self.max_output = max_output
        self.use_bubblewrap = use_bubblewrap and shutil.which("bwrap") is not None

    def _cap(self, s: str) -> str:
        return s if len(s) <= self.max_output else s[: self.max_output] + "\n...[truncated]"

    async def run(self, argv: list[str], cwd: Path | None = None, timeout_s: float | None = None) -> RunResult:
        cwd = (cwd or self.workspace).resolve()
        if cwd != self.workspace and self.workspace not in cwd.parents:
            raise PermissionError("cwd outside workspace")
        program = shutil.which(argv[0])
        if program is None:
            return RunResult(127, "", f"program not found: {argv[0]}")
        full = [program, *argv[1:]]
        if self.use_bubblewrap:
            full = bubblewrap_argv(full, self.workspace)
        proc = await asyncio.create_subprocess_exec(
            *full, cwd=str(cwd), env=scrubbed_env(),
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
        )
        try:
            out, err = await asyncio.wait_for(proc.communicate(), timeout_s or self.timeout_s)
        except asyncio.TimeoutError:
            proc.kill()
            await proc.wait()
            return RunResult(-1, "", "", timed_out=True)
        return RunResult(
            proc.returncode if proc.returncode is not None else -1,
            self._cap(out.decode(errors="replace")),
            self._cap(err.decode(errors="replace")),
        )
