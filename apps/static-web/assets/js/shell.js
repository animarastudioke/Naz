/* Renders the dashboard sidebar into <div id="sidebar-placeholder"></div> and
   highlights the current page. Kept in one file so the nav only needs
   editing once; the actual page content next to it stays plain static HTML
   you can edit directly in Dreamweaver. */
(function () {
  var NAV_ITEMS = [
    { href: "/dashboard/index.html", label: "Overview" },
    { href: "/dashboard/clients.html", label: "Clients" },
    { href: "/dashboard/bookings.html", label: "Bookings" },
    { href: "/dashboard/quotations.html", label: "Quotations" },
    { href: "/dashboard/invoices.html", label: "Invoices" },
    { href: "/dashboard/payments.html", label: "Payments" },
    { href: "/dashboard/expenses.html", label: "Expenses" },
    { href: "/dashboard/analytics.html", label: "Analytics" },
    { href: "/dashboard/team.html", label: "Team" },
    { href: "/dashboard/settings.html", label: "Settings" },
  ];

  function currentFile() {
    var path = window.location.pathname;
    var file = path.substring(path.lastIndexOf("/") + 1);
    return file && file.indexOf(".") !== -1 ? file : "index.html";
  }

  function render() {
    var placeholder = document.getElementById("sidebar-placeholder");
    if (!placeholder) return;
    var current = currentFile();

    var navHtml = NAV_ITEMS.map(function (item) {
      var itemFile = item.href.substring(item.href.lastIndexOf("/") + 1);
      var active = itemFile === current ? " active" : "";
      return '<a href="' + item.href + '" class="' + active.trim() + '">' + item.label + "</a>";
    }).join("");

    placeholder.innerHTML =
      '<aside class="sidebar">' +
      '<div class="sidebar-brand"><div class="logo-dot"></div><span id="business-name">KaziHQ</span></div>' +
      '<nav class="sidebar-nav">' + navHtml + "</nav>" +
      '<div class="sidebar-footer">' +
      '<p class="email" id="user-email"></p>' +
      '<button class="btn btn-ghost btn-sm" style="padding:4px 0;" onclick="KaziAPI.session.logout()">Sign out</button>' +
      "</div>" +
      "</aside>";
  }

  window.KaziShell = { render: render };
})();
