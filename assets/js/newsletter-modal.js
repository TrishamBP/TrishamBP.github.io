// Newsletter modals: a button with data-modal-open="<dialog id>" opens that
// <dialog>; [data-modal-close] or a click on the backdrop closes it. Esc is
// handled natively by <dialog>.
(function () {
  document.querySelectorAll("[data-modal-open]").forEach(function (btn) {
    var dialog = document.getElementById(btn.getAttribute("data-modal-open"));
    if (!dialog || typeof dialog.showModal !== "function") return;

    btn.addEventListener("click", function () {
      dialog.showModal();
    });

    dialog.querySelectorAll("[data-modal-close]").forEach(function (close) {
      close.addEventListener("click", function () {
        dialog.close();
      });
    });

    // A click whose target is the <dialog> itself landed on the backdrop.
    dialog.addEventListener("click", function (e) {
      if (e.target === dialog) dialog.close();
    });
  });
})();
