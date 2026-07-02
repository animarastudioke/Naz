/* Minimal SVG charts: single-hue trend line + ranked magnitude bars.
   Same mark specs as the rest of the app: thin 2px line, rounded caps,
   hairline gridlines, one accent hue, direct value labels. */
(function () {
  function renderTrendLineChart(containerId, data, currency) {
    var el = document.getElementById(containerId);
    if (!data || data.length === 0) {
      el.innerHTML = '<div class="empty-state">No data yet</div>';
      return;
    }
    var width = 640, height = 220;
    var padding = { top: 16, right: 16, bottom: 28, left: 16 };
    var max = Math.max.apply(null, data.map(function (d) { return d.value; }).concat([1]));
    var innerWidth = width - padding.left - padding.right;
    var innerHeight = height - padding.top - padding.bottom;
    var step = data.length > 1 ? innerWidth / (data.length - 1) : 0;

    var points = data.map(function (d, i) {
      return { x: padding.left + step * i, y: padding.top + innerHeight * (1 - d.value / max) };
    });
    var path = points.map(function (p, i) { return (i === 0 ? "M " : "L ") + p.x + " " + p.y; }).join(" ");

    var gridLines = [0.25, 0.5, 0.75, 1].map(function (f) {
      var y = padding.top + innerHeight * (1 - f);
      return '<line x1="' + padding.left + '" x2="' + (width - padding.right) + '" y1="' + y + '" y2="' + y + '" stroke="#e1e0d9" stroke-width="1" />';
    }).join("");

    var labels = data.map(function (d, i) {
      return '<text x="' + (padding.left + step * i) + '" y="' + (height - 8) + '" text-anchor="middle" font-size="10" fill="#898781">' + d.label + "</text>";
    }).join("");

    el.innerHTML =
      '<svg viewBox="0 0 ' + width + " " + height + '" style="width:100%;max-height:220px;">' +
      gridLines +
      '<path d="' + path + '" fill="none" stroke="#2a78d6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />' +
      labels +
      "</svg>";
  }

  function renderRankedBarChart(containerId, data, currency) {
    var el = document.getElementById(containerId);
    if (!data || data.length === 0) {
      el.innerHTML = '<div class="empty-state">No data yet</div>';
      return;
    }
    var max = Math.max.apply(null, data.map(function (d) { return d.value; }).concat([1]));
    el.innerHTML = data
      .map(function (d) {
        var pct = Math.max(4, (d.value / max) * 100);
        return (
          '<div style="margin-bottom:12px;">' +
          '<div class="space-between text-xs mb-1"><span class="font-semibold">' + window.KaziUI.escapeHtml(d.label) +
          '</span><span class="text-muted">' + window.KaziUI.money(d.value, currency) + "</span></div>" +
          '<div style="height:8px;width:100%;background:var(--line-hairline);border-radius:999px;overflow:hidden;">' +
          '<div style="height:100%;background:var(--brand-500);border-radius:999px;width:' + pct + '%;"></div>' +
          "</div></div>"
        );
      })
      .join("");
  }

  window.KaziCharts = {
    renderTrendLineChart: renderTrendLineChart,
    renderRankedBarChart: renderRankedBarChart,
  };
})();
