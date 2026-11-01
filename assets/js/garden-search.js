/* Digital Garden search (_includes/garden-search.html).

   Opens a search dialog over /digital-garden/search.json: one entry per
   section of every guide page. Each result shows where it lives
   (guide > note > section), a snippet of the matching text with the words
   highlighted, and links straight to that section's #anchor.

   Matching, in plain terms:
   - Question words are ignored ("what is a closure" searches "closure").
   - Plurals match singulars ("traits" finds "trait").
   - Words from other languages map to the Rust concept ("lambda" ->
     closure, "exception" -> Result/error, "interface" -> trait, ...).
   - Every word must match somewhere; if nothing matches all of them, the
     best partial matches are shown instead.
   - A hit in a section title counts far more than a hit in body text.

   Keyboard: "/" or Ctrl/Cmd+K opens, arrows move, Enter opens, Esc closes. */
(function () {
  "use strict";

  var triggers = document.querySelectorAll("[data-dg-search-open]");
  if (!triggers.length) return;

  var STOP = toSet(
    "a an and are as at be by can do does for from get how i in into is it its me my of on or should so " +
    "that the their then there these this to used using vs was what when where which who why with " +
    "you your explain explained mean means meaning work works rust " +
    "write make create add need want know find show happen happens difference between example examples"
  );

  // Other-language / everyday words -> Rust vocabulary used in the notes.
  var ALIASES = {
    exception: ["error", "result"], exceptions: ["error", "result"], raise: ["error", "result", "panic"],
    try: ["result", "?"], catch: ["match", "result"], throw: ["error", "panic"],
    lambda: ["closure"], lambdas: ["closure"], anonymous: ["closure"],
    interface: ["trait"], interfaces: ["trait"], protocol: ["trait"], inheritance: ["trait"],
    class: ["struct", "impl"], classes: ["struct", "impl"], object: ["struct"],
    list: ["vec"], lists: ["vec"], array: ["array", "[t; n]"],
    null: ["option"], none: ["option"], nil: ["option"],
    constructor: ["new", "constructor"], init: ["new", "constructor"], __init__: ["new"],
    import: ["use"], imports: ["use"], package: ["crate", "module"], namespace: ["module"],
    dataclass: ["derive"], decorator: ["attribute"], annotation: ["attribute"],
    docstring: ["doc comment", "///"], repr: ["debug"], __repr__: ["debug"],
    __str__: ["display"], tostring: ["display", "to_string"], print: ["println", "display", "debug"],
    __eq__: ["partialeq"], equality: ["partialeq", "eq"], compare: ["partialeq"],
    pointer: ["reference", "borrow"], reference: ["reference", "borrow"], garbage: ["ownership", "drop"],
    gc: ["ownership", "drop"], free: ["drop", "free"], memory: ["heap", "stack", "memory"],
    loop: ["for", "loop", "iterator"], comprehension: ["iterator", "map"], generator: ["iterator", "lazy"],
    static: ["associated function", "const"], staticmethod: ["associated function"],
    unittest: ["test"], pytest: ["test"], assert: ["assert"], mock: ["test"],
    "&": ["borrow", "reference"], "?": ["?", "question mark"], "::<>": ["turbofish"], fn: ["function", "fn"]
  };

  var state = {
    index: null, loading: null, scope: "", active: -1, results: [],
    dialog: null, input: null, list: null, status: null, lastFocus: null
  };

  function toSet(words) {
    var s = Object.create(null);
    words.split(/\s+/).forEach(function (w) { if (w) s[w] = true; });
    return s;
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

  var NAMED = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
  function decodeEntities(s) {
    return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, function (m, code) {
      if (code[0] === "#") {
        var n = code[1] === "x" || code[1] === "X" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
        return isNaN(n) ? m : String.fromCodePoint(n);
      }
      var c = NAMED[code.toLowerCase()];
      return c === undefined ? m : c;
    });
  }

  /* ---------- index ---------- */

  function load(url) {
    if (state.index) return Promise.resolve(state.index);
    if (state.loading) return state.loading;
    state.loading = fetch(url, { credentials: "same-origin" })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (rows) {
        state.index = rows.map(function (e) {
          // Jekyll's strip_html keeps entities (&amp;, &lt;, &#39;): decode once
          // here, so snippets don't show them (escapeHtml re-escapes on render).
          e.t = decodeEntities(e.t);
          e.s = decodeEntities(e.s);
          e.p = decodeEntities(e.p);
          return {
            e: e,
            s: e.s.toLowerCase(),
            p: (e.p + " " + e.g).toLowerCase(),
            k: e.k.toLowerCase(),
            t: e.t.toLowerCase()
          };
        });
        return state.index;
      });
    state.loading.catch(function () { state.loading = null; });
    return state.loading;
  }

  /* ---------- query -> term groups ---------- */

  function forms(word) {
    var out = [word];
    if (word.length > 4 && /ies$/.test(word)) out.push(word.slice(0, -3) + "y");
    else if (word.length > 4 && /(ses|xes|ches|shes)$/.test(word)) out.push(word.slice(0, -2));
    else if (word.length > 3 && /s$/.test(word) && !/ss$/.test(word)) out.push(word.slice(0, -1));
    if (word.length > 5 && /ing$/.test(word)) out.push(word.slice(0, -3));
    if (ALIASES[word]) out = out.concat(ALIASES[word]);
    return out;
  }

  function parse(q) {
    var raw = q.toLowerCase().trim();
    var words = raw.split(/\s+/).map(function (w) {
      // Trim sentence punctuation, but keep symbol-only tokens (?, &, ::<>)
      // and macro names (write!, println!). A question mark after a word
      // ("closure?") is punctuation; on its own it's the ? operator.
      var t = w.replace(/^["'(,.:;]+|["'),.:;]+$/g, "");
      if (/[a-z]/.test(t)) t = t.replace(/\?+$/, "");
      return t || w;
    }).filter(Boolean);
    var meaningful = words.filter(function (w) { return !STOP[w]; });
    if (!meaningful.length) meaningful = words; // "use", "rust" on their own still search
    return {
      phrase: meaningful.join(" "),
      groups: meaningful.map(function (w) { return { word: w, forms: forms(w) }; })
    };
  }

  /* ---------- scoring ---------- */

  function count(hay, needle) {
    var n = 0, i = hay.indexOf(needle);
    while (i !== -1 && n < 6) { n++; i = hay.indexOf(needle, i + needle.length); }
    return n;
  }

  function scoreForm(row, f) {
    var sc = 0;
    if (row.s.indexOf(f) !== -1) sc += 14;
    if (row.p.indexOf(f) !== -1) sc += 6;
    if (row.k.indexOf(f) !== -1) sc += 4;
    return sc + count(row.t, f);
  }

  // The typed word (or its plural/singular) counts fully; the best alias adds
  // on top at a discount, so a section that uses the reader's own word wins a
  // tie against one that only uses the Rust equivalent.
  function scoreGroup(row, g) {
    var direct = 0, alias = 0;
    g.forms.forEach(function (f, i) {
      var sc = scoreForm(row, f);
      var isAlias = ALIASES[g.word] && ALIASES[g.word].indexOf(f) !== -1 && f !== g.word;
      if (isAlias) { if (sc > alias) alias = sc; }
      else if (sc > direct) direct = sc;
    });
    return direct + 0.6 * alias;
  }

  function search(q) {
    var query = parse(q);
    if (!query.groups.length) return [];
    var all = [], partial = [];
    state.index.forEach(function (row) {
      var total = 0, matched = 0;
      query.groups.forEach(function (g) {
        var s = scoreGroup(row, g);
        if (s > 0) matched++;
        total += s;
      });
      if (!matched) return;
      if (query.groups.length > 1) {
        if (row.s.indexOf(query.phrase) !== -1) total += 20;
        else if (row.t.indexOf(query.phrase) !== -1) total += 6;
      }
      if (state.scope && row.e.g === state.scope) total += 2;
      if (!row.e.s) total -= 1; // a page intro ranks below an equally good section
      var hit = { row: row, score: total, query: query };
      (matched === query.groups.length ? all : partial).push(hit);
    });
    var list = all.length ? all : partial;
    list.sort(function (a, b) { return b.score - a.score; });
    return list.slice(0, 8);
  }

  /* ---------- snippet ---------- */

  function snippet(text, query) {
    var lower = text.toLowerCase(), pos = -1, len = 0;
    // earliest position of the most specific (longest) matching form
    query.groups.forEach(function (g) {
      g.forms.forEach(function (f) {
        var i = lower.indexOf(f);
        if (i !== -1 && (pos === -1 || f.length > len || (f.length === len && i < pos))) { pos = i; len = f.length; }
      });
    });
    var start = 0, end = Math.min(text.length, 200);
    if (pos !== -1) {
      start = Math.max(0, pos - 70);
      end = Math.min(text.length, pos + 170);
      var dot = text.lastIndexOf(". ", pos);
      if (dot !== -1 && dot >= start - 40 && dot < pos) start = dot + 2;
      else if (start > 0) start = text.indexOf(" ", start) + 1 || start;
      if (end < text.length) end = text.lastIndexOf(" ", end) > pos ? text.lastIndexOf(" ", end) : end;
    }
    var out = escapeHtml(text.slice(start, end));
    var terms = [];
    query.groups.forEach(function (g) { g.forms.forEach(function (f) { if (f.length > 1 || /\W/.test(f)) terms.push(escapeHtml(f)); }); });
    terms.sort(function (a, b) { return b.length - a.length; });
    if (terms.length) {
      out = out.replace(new RegExp("(" + terms.map(escapeRe).join("|") + ")", "gi"), "<mark>$1</mark>");
    }
    return (start > 0 ? "&hellip;" : "") + out + (end < text.length ? "&hellip;" : "");
  }

  /* ---------- dialog ---------- */

  function build() {
    var d = document.createElement("div");
    d.className = "dg-search-dialog";
    d.hidden = true;
    d.setAttribute("role", "dialog");
    d.setAttribute("aria-modal", "true");
    d.setAttribute("aria-label", "Search the Digital Garden");
    d.innerHTML =
      '<div class="dg-search-backdrop" data-dg-search-close></div>' +
      '<div class="dg-search-panel">' +
      '  <div class="dg-search-field">' +
      '    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="M20 20l-4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
      '    <input type="search" class="dg-search-input" placeholder="Search a topic or concept, e.g. what is a closure" ' +
      '      autocomplete="off" spellcheck="false" role="combobox" aria-expanded="false" aria-autocomplete="list" aria-controls="dg-search-results">' +
      '    <button type="button" class="dg-search-esc" data-dg-search-close aria-label="Close search">Esc</button>' +
      "  </div>" +
      '  <p class="dg-search-status" aria-live="polite"></p>' +
      '  <ul class="dg-search-results" id="dg-search-results" role="listbox" aria-label="Search results"></ul>' +
      '  <p class="dg-search-help"><kbd>&uarr;</kbd><kbd>&darr;</kbd> to move &middot; <kbd>Enter</kbd> to open &middot; <kbd>Esc</kbd> to close</p>' +
      "</div>";
    document.body.appendChild(d);
    state.dialog = d;
    state.input = d.querySelector(".dg-search-input");
    state.list = d.querySelector(".dg-search-results");
    state.status = d.querySelector(".dg-search-status");

    d.addEventListener("click", function (e) {
      if (e.target.closest("[data-dg-search-close]")) close();
    });
    state.input.addEventListener("input", run);
    state.input.addEventListener("keydown", onKey);
    state.list.addEventListener("mousemove", function (e) {
      var li = e.target.closest("[data-i]");
      if (li) setActive(+li.getAttribute("data-i"), false);
    });
    // Clicking a result on the current page only changes the hash: close the dialog.
    state.list.addEventListener("click", function (e) { if (e.target.closest("a")) close(true); });
  }

  function open(trigger) {
    if (!state.dialog) build();
    state.scope = trigger.getAttribute("data-dg-search-scope") || "";
    state.lastFocus = document.activeElement;
    state.dialog.hidden = false;
    document.documentElement.classList.add("dg-search-open");
    state.input.focus();
    state.input.select();
    var url = trigger.getAttribute("data-dg-search-index");
    if (!state.index) state.status.textContent = "Loading the index…";
    load(url).then(function () {
      state.status.textContent = "";
      run();
    }, function () {
      state.status.textContent = "Search couldn't load. Check your connection and try again.";
    });
  }

  function close(keepFocus) {
    if (!state.dialog || state.dialog.hidden) return;
    state.dialog.hidden = true;
    document.documentElement.classList.remove("dg-search-open");
    if (!keepFocus && state.lastFocus && state.lastFocus.focus) state.lastFocus.focus();
  }

  function run() {
    if (!state.index) return;
    var q = state.input.value;
    state.active = -1;
    if (!q.trim()) {
      state.results = [];
      state.list.innerHTML = "";
      state.status.textContent = "Try: ownership, closure, the ? operator, lifetime, trait, panic";
      state.input.setAttribute("aria-expanded", "false");
      return;
    }
    state.results = search(q);
    if (!state.results.length) {
      state.list.innerHTML = "";
      state.status.textContent = "No matches for “" + q + "”. Try a different word, like the Rust name for the idea.";
      state.input.setAttribute("aria-expanded", "false");
      return;
    }
    state.status.textContent = state.results.length + (state.results.length === 1 ? " result" : " results");
    state.list.innerHTML = state.results.map(function (r, i) {
      var e = r.row.e;
      var where = escapeHtml(e.g) + " &rsaquo; " + (e.n ? "Note " + escapeHtml(e.n) + " &middot; " : "") + escapeHtml(e.p);
      var title = e.s ? escapeHtml(e.s) : "Overview";
      return '<li role="option" id="dg-sr-' + i + '" data-i="' + i + '" aria-selected="false">' +
        '<a class="dg-sr" href="' + escapeHtml(e.u) + '">' +
        '<span class="dg-sr-where">' + (i === 0 ? '<span class="dg-sr-best">Best match</span>' : "") + where + "</span>" +
        '<span class="dg-sr-title">' + title + "</span>" +
        '<span class="dg-sr-snip">' + snippet(e.t, r.query) + "</span>" +
        "</a></li>";
    }).join("");
    state.input.setAttribute("aria-expanded", "true");
    setActive(0, false);
  }

  function setActive(i, scroll) {
    var items = state.list.children;
    if (!items.length) return;
    if (state.active >= 0 && items[state.active]) items[state.active].setAttribute("aria-selected", "false");
    state.active = (i + items.length) % items.length;
    var li = items[state.active];
    li.setAttribute("aria-selected", "true");
    state.input.setAttribute("aria-activedescendant", li.id);
    if (scroll) li.scrollIntoView({ block: "nearest" });
  }

  function onKey(e) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(state.active + 1, true); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive(state.active - 1, true); }
    else if (e.key === "Enter") {
      var li = state.list.children[state.active];
      if (li) { e.preventDefault(); close(true); window.location.href = li.querySelector("a").href; }
    } else if (e.key === "Escape") { e.preventDefault(); close(); }
    else if (e.key === "Tab") { e.preventDefault(); } // keep focus inside the dialog
  }

  /* ---------- wiring ---------- */

  triggers.forEach(function (t) {
    t.hidden = false;
    t.addEventListener("click", function () { open(t); });
  });

  document.addEventListener("keydown", function (e) {
    var tag = (e.target.tagName || "").toLowerCase();
    var typing = tag === "input" || tag === "textarea" || tag === "select" || e.target.isContentEditable;
    var isOpen = state.dialog && !state.dialog.hidden;
    if (!isOpen && ((e.key === "/" && !typing) || (e.key.toLowerCase() === "k" && (e.ctrlKey || e.metaKey)))) {
      e.preventDefault();
      open(triggers[0]);
    } else if (isOpen && e.key === "Escape") {
      close();
    }
  });
})();
