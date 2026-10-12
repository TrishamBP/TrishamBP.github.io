/* Live Hugging Face download counts.
 *
 * Any element with `data-hf-downloads="<repo id>"` gets that model's all-time
 * download count; any `data-hf-total` element gets the sum. The numbers
 * rendered by Jekyll (from _data/hf_models.yml) stay as the fallback when the
 * API is unreachable, so a failed request never blanks a card.
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
        el.textContent = fmt.format(live[id]);
        el.setAttribute("data-count", live[id]);
      }
    });

    /* Total = live count where we got one, Jekyll fallback otherwise. */
    var total = 0;
    ids.forEach(function (id) {
      if (id in live) {
        total += live[id];
      } else {
        var el = document.querySelector('[data-hf-downloads="' + id + '"]');
        total += parseInt(el.getAttribute("data-count"), 10) || 0;
      }
    });
    [].forEach.call(document.querySelectorAll("[data-hf-total]"), function (el) {
      el.textContent = fmt.format(total);
    });
  });
})();
