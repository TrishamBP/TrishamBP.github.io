/* Live Hugging Face download counts.
 *
 * Any element with `data-hf-downloads="<repo id>"` gets that model's all-time
 * download count; any `data-hf-total` element gets the sum. The numbers
 * rendered by Jekyll (from _data/hf_models.yml) stay as the fallback when the
 * API is unreachable, so a failed request never blanks a card.
 *
 * `data-extra` (from `extra_downloads` in hf_models.yml) is added on top of
 * the live count: downloads Hugging Face doesn't see, e.g. a direct company
 * install. The Jekyll fallback in `data-count` already includes it.
 */
(function () {
  var cells = [].slice.call(document.querySelectorAll("[data-hf-downloads]"));
  if (!cells.length || !window.fetch) return;

  var fmt = new Intl.NumberFormat("en-US");
  var ids = [];
  cells.forEach(function (el) {
    var id = el.getAttribute("data-hf-downloads");
    if (ids.indexOf(id) === -1) ids.push(id);
  });

  function fetchCount(id) {
    var url =
      "https://huggingface.co/api/models/" + id + "?expand[]=downloadsAllTime";
    return fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error(res.status);
        return res.json();
      })
      .then(function (data) {
        return typeof data.downloadsAllTime === "number"
          ? data.downloadsAllTime
          : null;
      })
      .catch(function () {
        return null;
      });
  }

  Promise.all(ids.map(fetchCount)).then(function (counts) {
    var live = {};
    ids.forEach(function (id, i) {
      if (counts[i] !== null) live[id] = counts[i];
    });

    cells.forEach(function (el) {
      var id = el.getAttribute("data-hf-downloads");
      if (id in live) {
        var n = live[id] + (parseInt(el.getAttribute("data-extra"), 10) || 0);
        el.textContent = fmt.format(n);
        el.setAttribute("data-count", n);
      }
    });

    /* Total = live count where we got one, Jekyll fallback otherwise. */
    var total = 0;
    ids.forEach(function (id) {
      /* data-count holds live + extra once updated above, else the fallback. */
      var el = document.querySelector('[data-hf-downloads="' + id + '"]');
      total += parseInt(el.getAttribute("data-count"), 10) || 0;
    });
    [].forEach.call(document.querySelectorAll("[data-hf-total]"), function (el) {
      el.textContent = fmt.format(total);
    });
  });
})();
