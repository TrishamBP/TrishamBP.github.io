/* Digital Garden docs pages (_layouts/garden.html).
   1. Mobile: the "Contents" button shows / hides the sidebar.
   2. Scroll spy: highlights the sidebar subsection you're reading.
   Everything works without JS: the sidebar is then always expanded. */
(function () {
  var side = document.querySelector(".dg-side");
  if (!side) return;

  var toggle = side.querySelector(".dg-side-toggle");
  if (toggle) {
    side.classList.add("is-collapsible");
    toggle.addEventListener("click", function () {
      var open = side.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    // Jumping to a subsection on a phone closes the menu again.
    side.addEventListener("click", function (e) {
      if (e.target.closest(".dg-side-sub a")) {
        side.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  var current = side.querySelector(".dg-side-item.is-current");
  if (!current || !("IntersectionObserver" in window)) return;

  var links = {};
  current.querySelectorAll("[data-dg-target]").forEach(function (a) {
    links[a.getAttribute("data-dg-target")] = a;
  });
  var heads = Object.keys(links)
    .map(function (id) { return document.getElementById(id); })
    .filter(Boolean);
  if (!heads.length) return;

  var active = null;
  function setActive(id) {
    if (active === id) return;
    if (active && links[active]) links[active].classList.remove("is-active");
    active = id;
    if (links[id]) links[id].classList.add("is-active");
  }

  // The active section is the last heading that has scrolled past ~30% of
  // the viewport. Recomputed on every intersection change.
  function update() {
    var line = window.innerHeight * 0.3;
    var pick = heads[0].id;
    for (var i = 0; i < heads.length; i++) {
      if (heads[i].getBoundingClientRect().top - line <= 0) pick = heads[i].id;
    }
    setActive(pick);
  }

  var io = new IntersectionObserver(update, { rootMargin: "0px 0px -70% 0px" });
  heads.forEach(function (h) { io.observe(h); });
  window.addEventListener("scroll", function () {
    window.requestAnimationFrame(update);
  }, { passive: true });
  update();
})();
