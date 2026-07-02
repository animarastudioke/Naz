/* Small shared UI helpers: HTML escaping, formatting, badges, modals. */
(function () {
  function escapeHtml(value) {
    if (value === null || value === undefined) return "";
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function money(value, currency) {
    var num = Number(value || 0);
    return (currency || "KES") + " " + num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  function formatDate(value) {
    if (!value) return "—";
    return new Date(value).toLocaleDateString();
  }
  function formatDateTime(value) {
    if (!value) return "—";
    return new Date(value).toLocaleString();
  }

  var BADGE_CLASSES = {
    DRAFT: "badge",
    SENT: "badge-brand",
    VIEWED: "badge-brand",
    PENDING: "badge-warning",
    CONFIRMED: "badge-good",
    APPROVED: "badge-good",
    PAID: "badge-good",
    SUCCESS: "badge-good",
    COMPLETED: "badge-good",
    PARTIALLY_PAID: "badge-warning",
    OVERDUE: "badge-critical",
    DECLINED: "badge-critical",
    CANCELLED: "badge-critical",
    FAILED: "badge-critical",
    VOID: "badge",
    EXPIRED: "badge",
    NO_SHOW: "badge-critical",
    RESCHEDULED: "badge-warning",
    CONVERTED: "badge-brand",
  };

  function badgeHtml(status) {
    var cls = BADGE_CLASSES[status] || "badge";
    return '<span class="badge ' + cls + '">' + escapeHtml(status) + "</span>";
  }

  function openModal(id) {
    document.getElementById(id).classList.add("open");
  }
  function closeModal(id) {
    document.getElementById(id).classList.remove("open");
  }

  function showError(elId, message) {
    var el = document.getElementById(elId);
    if (!el) return;
    el.textContent = message;
    el.style.display = message ? "block" : "none";
  }

  /** Call at the top of every dashboard/*.html page. Redirects to login if
   *  not authenticated, and fills in the sidebar's business name / email. */
  function initDashboardShell() {
    if (!window.KaziAPI.session.requireAuth()) return false;
    if (window.KaziShell) window.KaziShell.render();
    var biz = window.KaziAPI.session.getBusiness();
    var user = window.KaziAPI.session.getUser();
    var bizEl = document.getElementById("business-name");
    var userEl = document.getElementById("user-email");
    if (biz && bizEl) bizEl.textContent = biz.name;
    if (user && userEl) userEl.textContent = user.email;
    return true;
  }

  window.KaziUI = {
    escapeHtml: escapeHtml,
    money: money,
    formatDate: formatDate,
    formatDateTime: formatDateTime,
    badgeHtml: badgeHtml,
    openModal: openModal,
    closeModal: closeModal,
    showError: showError,
    initDashboardShell: initDashboardShell,
  };
})();
