/* Projects page terminal typing.
 *
 * Every line is already in the HTML, so search engines and no-JS visitors get
 * the whole page. This script only hides it and replays it as if typed:
 *
 *   hero    [data-tx-seq] steps through its [data-tx-step] children in order.
 *           A step's [data-type] command is typed character by character, and
 *           the output steps after it simply appear, like a real shell.
 *   cards   each [data-tx-card] types its `cat file.md` line when it scrolls
 *           into view, then opens its window ([data-tx-body]).
 *
 * Clicking the hero or pressing any key finishes the hero instantly. Under
 * prefers-reduced-motion nothing is hidden and nothing is typed.
 */
(function () {
  var body = document.body;
  var hero = document.querySelector("[data-tx-seq]");
  var cards = [].slice.call(document.querySelectorAll("[data-tx-card]"));

  var now = document.querySelector("[data-tx-now]");
  if (now) now.textContent = formatNow(new Date());

  var reduce =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || !("IntersectionObserver" in window)) return;

  body.classList.add("tx-anim");

  var skip = false;

  function wait(ms) {
    return new Promise(function (resolve) {
      if (skip || ms <= 0) return resolve();
      setTimeout(resolve, ms);
    });
  }

  /* Strip the text out of every text node under `el`, then put it back one
     character at a time, so nested spans (like the orange file name) keep
     their colour while being typed. */
  function prepare(el) {
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    var nodes = [];
    while (walker.nextNode()) {
      nodes.push({ node: walker.currentNode, text: walker.currentNode.nodeValue });
    }
    nodes.forEach(function (n) {
      n.node.nodeValue = "";
    });
    el._txNodes = nodes;
  }

  function type(el, speed) {
    var nodes = el._txNodes || [];
    var line = el.closest(".tx-line");
    if (line) line.classList.add("is-typing");
    var chain = Promise.resolve();
    nodes.forEach(function (n) {
      for (var i = 1; i <= n.text.length; i += 1) {
        (function (i) {
          chain = chain.then(function () {
            if (skip) {
              n.node.nodeValue = n.text;
              return;
            }
            n.node.nodeValue = n.text.slice(0, i);
            return wait(speed + Math.random() * speed * 0.8);
          });
        })(i);
      }
    });
    return chain.then(function () {
      nodes.forEach(function (n) {
        n.node.nodeValue = n.text;
      });
      if (line) line.classList.remove("is-typing");
    });
  }

  [].forEach.call(document.querySelectorAll("[data-type]"), prepare);

  function runHero() {
    if (!hero) return Promise.resolve();

    function finish() {
      skip = true;
    }
    hero.addEventListener("click", finish);
    document.addEventListener("keydown", finish);

    var steps = [].slice.call(hero.querySelectorAll("[data-tx-step]"));
    var chain = wait(350);
    steps.forEach(function (step) {
      chain = chain.then(function () {
        step.classList.add("is-shown");
        var cmd = step.querySelector("[data-type]");
        if (cmd) return wait(180).then(function () {
          return type(cmd, 55);
        }).then(function () {
          return wait(260);
        });
        return wait(140);
      });
    });
    return chain.then(function () {
      hero.removeEventListener("click", finish);
      document.removeEventListener("keydown", finish);
      skip = false;
    });
  }

  function watchCards() {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          observer.unobserve(entry.target);
          openCard(entry.target);
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 }
    );
    cards.forEach(function (card) {
      observer.observe(card);
    });
  }

  function openCard(card) {
    card.classList.add("is-shown");
    var cmd = card.querySelector("[data-type]");
    var typed = cmd ? type(cmd, 26) : Promise.resolve();
    typed.then(function () {
      return wait(120);
    }).then(function () {
      card.classList.add("is-open");
    });
  }

  /* Cards start watching right away, so a visitor who scrolls past the hero
     before it finishes typing still sees the cards open. */
  runHero();
  watchCards();

  function formatNow(d) {
    var days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    function pad(n) {
      return (n < 10 ? "0" : "") + n;
    }
    return (
      days[d.getDay()] + " " + months[d.getMonth()] + " " + pad(d.getDate()) + " " +
      pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds()) + " " +
      d.getFullYear()
    );
  }
})();
