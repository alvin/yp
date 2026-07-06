(function () {
  var WIREFRAMES = {
    "lookup_screen.html": true,
    "name_search_results.html": true,
    "date_search_results.html": true,
    "transaction_screen.html": true,
    "print_screen.html": true,
  };

  var LABELS = {
    "requirements.md": "Requirements",
    "screen_navigation.md": "Screen navigation",
    "lookup_screen.html": "Lookup Screen",
    "name_search_results.html": "Name Search Results",
    "date_search_results.html": "Date Search Results",
    "transaction_screen.html": "Transaction Screen",
    "print_screen.html": "Print Screen",
    "reservation_confirmation.html": "Reservation Confirmation Slip",
    "check_in_folio.html": "Check-in Folio",
    "checkout_bill.html": "Check-out Bill / Guest Invoice",
    "cancellation_notice.html": "Cancellation Notice",
    "housekeeping_report.html": "Housekeeping Report",
    "in_house_report.html": "In House Report",
    "kitchen_meal_report.html": "Kitchen / Meal Report",
    "kitchen_report_single.html": "Kitchen Report (single / filtered)",
    "manual_sales_list.html": "Manual Sales List",
    "daily_cash_activity_notes.html": "Notes on Daily Cash Activity Report",
    "daily_cash_activity_report.html": "Daily Cash Activity Report",
    "deposits_received.html": "Deposits Received",
    "deposits_applied.html": "Deposits Applied",
    "cashier_detail.html": "Cashier Detail",
    "items_cashed_out.html": "Items Cashed Out",
    "lookup_screen.feature": "Lookup Screen feature",
    "name_search_results.feature": "Name Search Results feature",
    "date_search_results.feature": "Date Search Results feature",
    "transaction_screen.feature": "Transaction Screen feature",
    "print_screen.feature": "Print Screen feature",
    "printed_outputs.feature": "Printed Outputs feature",
    "daily_cash_reporting.feature": "Daily Cash Reporting feature",
  };

  var GUEST_DOCUMENT_REPORTS = {
    "reservation_confirmation.html": true,
    "check_in_folio.html": true,
    "checkout_bill.html": true,
    "cancellation_notice.html": true,
  };

  var OPERATIONS_REPORTS = {
    "housekeeping_report.html": true,
    "in_house_report.html": true,
    "kitchen_meal_report.html": true,
    "kitchen_report_single.html": true,
    "manual_sales_list.html": true,
  };

  var DAILY_CASH_REPORTS = {
    "daily_cash_activity_notes.html": true,
    "daily_cash_activity_report.html": true,
    "deposits_received.html": true,
    "deposits_applied.html": true,
    "cashier_detail.html": true,
    "items_cashed_out.html": true,
  };

  var FEATURE_CONTEXT = {
    "lookup_screen.feature": {
      title: "Lookup Screen feature",
      links: [
        {
          label: "Screen",
          href: "/original_spec/wireframes/html/lookup_screen.html",
          kind: "wireframe",
        },
        {
          label: "Print Screen",
          href: "/original_spec/wireframes/html/print_screen.html",
          kind: "wireframe",
        },
        {
          label: "Daily cash reporting",
          href: "/original_spec/reports/#daily-cash-reporting",
          kind: "report",
        },
      ],
    },
    "name_search_results.feature": {
      title: "Name Search Results feature",
      links: [
        {
          label: "Screen",
          href: "/original_spec/wireframes/html/name_search_results.html",
          kind: "wireframe",
        },
        {
          label: "Lookup Screen",
          href: "/original_spec/wireframes/html/lookup_screen.html",
          kind: "wireframe",
        },
        {
          label: "Transaction Screen",
          href: "/original_spec/wireframes/html/transaction_screen.html",
          kind: "wireframe",
        },
      ],
    },
    "date_search_results.feature": {
      title: "Date Search Results feature",
      links: [
        {
          label: "Screen",
          href: "/original_spec/wireframes/html/date_search_results.html",
          kind: "wireframe",
        },
        {
          label: "Lookup Screen",
          href: "/original_spec/wireframes/html/lookup_screen.html",
          kind: "wireframe",
        },
        {
          label: "Transaction Screen",
          href: "/original_spec/wireframes/html/transaction_screen.html",
          kind: "wireframe",
        },
      ],
    },
    "transaction_screen.feature": {
      title: "Transaction Screen feature",
      links: [
        {
          label: "Screen",
          href: "/original_spec/wireframes/html/transaction_screen.html",
          kind: "wireframe",
        },
        {
          label: "Guest documents",
          href: "/original_spec/reports/#guest-documents",
          kind: "report",
        },
        {
          label: "Operational reports",
          href: "/original_spec/reports/#operations-reports",
          kind: "report",
        },
        {
          label: "Daily cash reporting",
          href: "/original_spec/reports/#daily-cash-reporting",
          kind: "report",
        },
      ],
    },
    "print_screen.feature": {
      title: "Print Screen feature",
      links: [
        {
          label: "Screen",
          href: "/original_spec/wireframes/html/print_screen.html",
          kind: "wireframe",
        },
        {
          label: "Guest documents",
          href: "/original_spec/reports/#guest-documents",
          kind: "report",
        },
        {
          label: "Operational reports",
          href: "/original_spec/reports/#operations-reports",
          kind: "report",
        },
      ],
    },
    "printed_outputs.feature": {
      title: "Printed Outputs feature",
      links: [
        {
          label: "Report library",
          href: "/original_spec/reports/",
          kind: "report",
        },
        {
          label: "Guest documents",
          href: "/original_spec/reports/#guest-documents",
          kind: "report",
        },
        {
          label: "Operational reports",
          href: "/original_spec/reports/#operations-reports",
          kind: "report",
        },
      ],
    },
    "daily_cash_reporting.feature": {
      title: "Daily Cash Reporting feature",
      links: [
        {
          label: "Report library",
          href: "/original_spec/reports/",
          kind: "report",
        },
        {
          label: "Daily cash reporting",
          href: "/original_spec/reports/#daily-cash-reporting",
          kind: "report",
        },
        {
          label: "Lookup Screen",
          href: "/original_spec/wireframes/html/lookup_screen.html",
          kind: "wireframe",
        },
        {
          label: "Transaction Screen",
          href: "/original_spec/wireframes/html/transaction_screen.html",
          kind: "wireframe",
        },
      ],
    },
  };

  function ready(fn) {
    if (document.readyState === "loading")
      document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  function attr(name, fallback) {
    return document.body.getAttribute(name) || fallback;
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function filename(path) {
    return String(path).split("/").pop().trim();
  }

  function currentPath() {
    var path = window.location.pathname || "";
    if (!path) return "";
    if (path.slice(-1) === "/") path += "index.html";
    return path;
  }

  function currentName() {
    return filename(currentPath());
  }

  function titleize(text) {
    return String(text)
      .replace(/\.(feature|html|md)$/i, "")
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, function (ch) {
        return ch.toUpperCase();
      });
  }

  function displayName(ref) {
    var name = filename(ref);
    return LABELS[name] || titleize(name);
  }

  function displayNameFromHref(href, fallback) {
    if (!href) return fallback;
    if (/\/scope\/$/.test(href) || /\/scope\/index\.html$/.test(href))
      return "Scope home";
    if (
      /\/scope\/wireframes\/$/.test(href) ||
      /\/scope\/wireframes\/index\.html$/.test(href)
    )
      return "Screens";
    if (
      /\/scope\/reports\/$/.test(href) ||
      /\/scope\/reports\/index\.html$/.test(href)
    )
      return "Reports";
    return displayName(href) || fallback;
  }

  function hrefFor(ref) {
    var clean = String(ref)
      .trim()
      .replace(/[),.;]+$/, "");
    var name = filename(clean);

    if (/\.feature$/i.test(name))
      return attr("data-feature-base", "../features/") + name;
    if (/\.html$/i.test(name)) {
      if (WIREFRAMES[name] || clean.indexOf("wireframes/") !== -1) {
        return attr("data-wireframe-base", "./wireframes/html/") + name;
      }
      return attr("data-report-base", "./reports/") + name;
    }
    return clean;
  }

  function classify(ref) {
    var name = filename(ref);
    if (/\.feature$/i.test(name)) return "feature";
    if (/\.md$/i.test(name)) return "doc";
    if (
      /\.html$/i.test(name) &&
      (WIREFRAMES[name] || String(ref).indexOf("wireframes/") !== -1)
    )
      return "wireframe";
    if (/\.html$/i.test(name)) return "report";
    return "link";
  }

  function currentPageContext() {
    var name = currentName();

    if (name === "lookup_screen.html") {
      return {
        breadcrumb: [
          { label: "Scope home", href: "/original_spec/" },
          { label: "Screens", href: "/original_spec/wireframes/" },
          { label: "Lookup Screen" },
        ],
        feature: "lookup_screen.feature",
        links: [
          {
            label: "Print Screen",
            href: "/original_spec/wireframes/html/print_screen.html",
            kind: "wireframe",
          },
          {
            label: "Daily cash reporting",
            href: "/original_spec/reports/#daily-cash-reporting",
            kind: "report",
          },
        ],
      };
    }

    if (name === "name_search_results.html") {
      return {
        breadcrumb: [
          { label: "Scope home", href: "/original_spec/" },
          { label: "Screens", href: "/original_spec/wireframes/" },
          { label: "Name Search Results" },
        ],
        feature: "name_search_results.feature",
        links: [
          {
            label: "Lookup Screen",
            href: "/original_spec/wireframes/html/lookup_screen.html",
            kind: "wireframe",
          },
          {
            label: "Transaction Screen",
            href: "/original_spec/wireframes/html/transaction_screen.html",
            kind: "wireframe",
          },
        ],
      };
    }

    if (name === "date_search_results.html") {
      return {
        breadcrumb: [
          { label: "Scope home", href: "/original_spec/" },
          { label: "Screens", href: "/original_spec/wireframes/" },
          { label: "Date Search Results" },
        ],
        feature: "date_search_results.feature",
        links: [
          {
            label: "Lookup Screen",
            href: "/original_spec/wireframes/html/lookup_screen.html",
            kind: "wireframe",
          },
          {
            label: "Transaction Screen",
            href: "/original_spec/wireframes/html/transaction_screen.html",
            kind: "wireframe",
          },
        ],
      };
    }

    if (name === "transaction_screen.html") {
      return {
        breadcrumb: [
          { label: "Scope home", href: "/original_spec/" },
          { label: "Screens", href: "/original_spec/wireframes/" },
          { label: "Transaction Screen" },
        ],
        feature: "transaction_screen.feature",
        links: [
          {
            label: "Lookup Screen",
            href: "/original_spec/wireframes/html/lookup_screen.html",
            kind: "wireframe",
          },
          {
            label: "Print Screen",
            href: "/original_spec/wireframes/html/print_screen.html",
            kind: "wireframe",
          },
          {
            label: "Guest documents",
            href: "/original_spec/reports/#guest-documents",
            kind: "report",
          },
          {
            label: "Operational reports",
            href: "/original_spec/reports/#operations-reports",
            kind: "report",
          },
          {
            label: "Daily cash reporting",
            href: "/original_spec/reports/#daily-cash-reporting",
            kind: "report",
          },
        ],
      };
    }

    if (name === "print_screen.html") {
      return {
        breadcrumb: [
          { label: "Scope home", href: "/original_spec/" },
          { label: "Screens", href: "/original_spec/wireframes/" },
          { label: "Print Screen" },
        ],
        feature: "print_screen.feature",
        links: [
          {
            label: "Lookup Screen",
            href: "/original_spec/wireframes/html/lookup_screen.html",
            kind: "wireframe",
          },
          {
            label: "Guest documents",
            href: "/original_spec/reports/#guest-documents",
            kind: "report",
          },
          {
            label: "Operational reports",
            href: "/original_spec/reports/#operations-reports",
            kind: "report",
          },
          {
            label: "Daily cash reporting",
            href: "/original_spec/reports/#daily-cash-reporting",
            kind: "report",
          },
        ],
      };
    }

    if (GUEST_DOCUMENT_REPORTS[name]) {
      return {
        breadcrumb: [
          { label: "Scope home", href: "/original_spec/" },
          { label: "Reports", href: "/original_spec/reports/" },
          { label: displayName(name) },
        ],
        feature: "printed_outputs.feature",
        links: [
          {
            label: "Guest documents",
            href: "/original_spec/reports/#guest-documents",
            kind: "report",
          },
          {
            label: "Transaction Screen",
            href: "/original_spec/wireframes/html/transaction_screen.html",
            kind: "wireframe",
          },
          {
            label: "Print Screen",
            href: "/original_spec/wireframes/html/print_screen.html",
            kind: "wireframe",
          },
        ],
      };
    }

    if (OPERATIONS_REPORTS[name]) {
      return {
        breadcrumb: [
          { label: "Scope home", href: "/original_spec/" },
          { label: "Reports", href: "/original_spec/reports/" },
          { label: displayName(name) },
        ],
        feature: "printed_outputs.feature",
        links: [
          {
            label: "Operational reports",
            href: "/original_spec/reports/#operations-reports",
            kind: "report",
          },
          {
            label: "Print Screen",
            href: "/original_spec/wireframes/html/print_screen.html",
            kind: "wireframe",
          },
          {
            label: "Transaction Screen",
            href: "/original_spec/wireframes/html/transaction_screen.html",
            kind: "wireframe",
          },
        ],
      };
    }

    if (DAILY_CASH_REPORTS[name]) {
      return {
        breadcrumb: [
          { label: "Scope home", href: "/original_spec/" },
          { label: "Reports", href: "/original_spec/reports/" },
          { label: displayName(name) },
        ],
        feature: "daily_cash_reporting.feature",
        links: [
          {
            label: "Daily cash reporting",
            href: "/original_spec/reports/#daily-cash-reporting",
            kind: "report",
          },
          {
            label: "Lookup Screen",
            href: "/original_spec/wireframes/html/lookup_screen.html",
            kind: "wireframe",
          },
          {
            label: "Transaction Screen",
            href: "/original_spec/wireframes/html/transaction_screen.html",
            kind: "wireframe",
          },
        ],
      };
    }

    return null;
  }

  function renderContextLinks(links) {
    return (links || [])
      .map(function (link) {
        return (
          '<a class="fp-context-link fp-context-' +
          escapeHtml(link.kind || "link") +
          '" href="' +
          escapeHtml(link.href) +
          '">' +
          escapeHtml(link.label) +
          "</a>"
        );
      })
      .join("");
  }

  function renderFeatureButton(featureName) {
    return (
      '<button type="button" class="fp-context-link fp-context-feature" data-feature-ref="' +
      escapeHtml(featureName) +
      '">' +
      escapeHtml(displayName(featureName)) +
      "</button>"
    );
  }

  function renderFeatureContext(featureName) {
    var meta = FEATURE_CONTEXT[featureName];
    if (!meta) return "";
    return (
      '<div class="fp-related">' +
      '<div class="fp-related-title">Where this fits</div>' +
      '<div class="fp-context-links">' +
      renderContextLinks(meta.links) +
      "</div>" +
      "</div>"
    );
  }

  function renderBreadcrumbs(items) {
    return (items || [])
      .map(function (item, index) {
        var bit = item.href
          ? '<a href="' +
            escapeHtml(item.href) +
            '">' +
            escapeHtml(item.label) +
            "</a>"
          : "<span>" + escapeHtml(item.label) + "</span>";
        if (index === 0) return bit;
        return '<span class="fp-breadcrumb-sep">/</span>' + bit;
      })
      .join("");
  }

  function insertContextPanel(anchor, page) {
    if (!anchor || !page) return;
    if (anchor.parentNode.querySelector(".fp-page-context")) return;

    var section = document.createElement("section");
    section.className = "fp-page-context";
    section.innerHTML = [
      '<div class="fp-page-context-title">Navigate</div>',
      '<div class="fp-context-links">',
      page.feature ? renderFeatureButton(page.feature) : "",
      renderContextLinks(page.links || []),
      "</div>",
    ].join("");

    if (anchor.nextSibling)
      anchor.parentNode.insertBefore(section, anchor.nextSibling);
    else anchor.parentNode.appendChild(section);
  }

  function enhanceWireframePage(page) {
    if (!page) return;
    var header = document.querySelector(".wireframe-page .topbar");
    if (!header) return;
    var meta = header.querySelector(".meta");
    if (meta) {
      meta.innerHTML = renderBreadcrumbs(page.breadcrumb);
    }
    insertContextPanel(header, page);
  }

  function enhanceReportPage(page) {
    if (!page) return;
    var reportPage = document.querySelector(".report-page");
    if (!reportPage) return;

    var toolbar = document.querySelector(".report-toolbar");
    if (!toolbar) {
      toolbar = document.createElement("div");
      toolbar.className = "report-toolbar";
    }

    toolbar.classList.add("fp-enhanced-toolbar");
    toolbar.innerHTML = [
      '<div class="fp-breadcrumbs">',
      renderBreadcrumbs(page.breadcrumb),
      "</div>",
      '<div class="fp-toolbar-links">',
      page.feature ? renderFeatureButton(page.feature) : "",
      renderContextLinks(page.links || []),
      "</div>",
    ].join("");

    reportPage.parentNode.insertBefore(toolbar, reportPage);
  }

  function enhanceCurrentPageNavigation() {
    var page = currentPageContext();
    if (!page) return;
    if (document.querySelector(".wireframe-page")) {
      enhanceWireframePage(page);
      return;
    }
    if (document.querySelector(".report-page")) {
      enhanceReportPage(page);
    }
  }

  function renderGherkin(text, featureName) {
    var lines = text.split(/\r?\n/);
    var out = ['<div class="fp-doc">', renderFeatureContext(featureName)];

    lines.forEach(function (raw) {
      var line = raw.trim();
      var match;

      if (!line) {
        out.push('<div class="fp-blank"></div>');
        return;
      }
      if (line.indexOf("#") === 0) {
        out.push(
          '<div class="fp-row fp-comment">' + escapeHtml(line) + "</div>",
        );
        return;
      }
      if (line.indexOf("@") === 0) {
        out.push('<div class="fp-row fp-tag">' + escapeHtml(line) + "</div>");
        return;
      }
      if ((match = line.match(/^(Feature):\s*(.*)$/))) {
        out.push(
          '<div class="fp-row fp-feature"><span class="fp-kw">' +
            escapeHtml(match[1]) +
            ":</span> <strong>" +
            escapeHtml(match[2]) +
            "</strong></div>",
        );
        return;
      }
      if (
        (match = line.match(
          /^(Background|Scenario Outline|Scenario|Examples|Example|Rule):\s*(.*)$/,
        ))
      ) {
        out.push(
          '<div class="fp-row fp-section"><span class="fp-kw">' +
            escapeHtml(match[1]) +
            ":</span> " +
            escapeHtml(match[2]) +
            "</div>",
        );
        return;
      }
      if ((match = line.match(/^(Given|When|Then|And|But|\*)\s+(.*)$/))) {
        out.push(
          '<div class="fp-row fp-step"><span class="fp-step-kw">' +
            escapeHtml(match[1]) +
            "</span> " +
            escapeHtml(match[2]) +
            "</div>",
        );
        return;
      }
      out.push('<div class="fp-row fp-text">' + escapeHtml(line) + "</div>");
    });

    out.push("</div>");
    return out.join("");
  }

  function ensureStyles() {
    if (document.getElementById("feature-preview-styles")) return;
    var style = document.createElement("style");
    style.id = "feature-preview-styles";
    style.textContent = [
      ".doc-ref-chip{display:inline-flex;align-items:center;padding:2px 10px;border-radius:999px;background:#ece8da;color:#1d1d1d;cursor:pointer;border:1px solid rgba(0,0,0,.15);font-size:.92em;line-height:1.5;text-decoration:none}",
      ".doc-ref-chip:hover{background:#e0d9c6}",
      ".feature-ref-chip{border-left:3px solid #5f7f65}",
      ".wireframe-ref-chip{border-left:3px solid #7d6fa0}",
      ".report-ref-chip{border-left:3px solid #a06f55}",
      ".doc-ref-chip.doc-ref-chip-doc{border-left:3px solid #5a708c}",
      ".fp-modal{position:fixed;inset:0;display:none;z-index:9999}",
      ".fp-modal.open{display:block}",
      ".fp-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.42)}",
      ".fp-panel{position:absolute;top:5vh;left:50%;transform:translateX(-50%);width:min(980px,92vw);height:min(84vh,900px);background:#fff;border-radius:14px;box-shadow:0 24px 60px rgba(0,0,0,.28);display:flex;flex-direction:column;overflow:hidden}",
      ".fp-top{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:14px 18px;border-bottom:1px solid #ddd;background:#f8f6ef}",
      ".fp-title{font:600 14px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace;color:#333}",
      ".fp-close{border:1px solid #bbb;background:#fff;border-radius:8px;padding:6px 10px;cursor:pointer}",
      ".fp-body{padding:18px 20px;overflow:auto;font:14px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace;background:#fff}",
      ".fp-related{font:13px/1.4 system-ui,sans-serif;background:#f8f6ef;border:1px solid #e2ddcf;border-radius:10px;padding:10px 12px;margin:0 0 14px}",
      ".fp-related-title{font-weight:700;margin-bottom:8px;color:#2b2b2b}",
      ".fp-context-links{display:flex;flex-wrap:wrap;gap:8px}",
      ".fp-context-link{display:inline-flex;align-items:center;margin:0;padding:5px 10px;border-radius:999px;text-decoration:none;background:#fff;border:1px solid #ddd;color:#222;font:13px/1.3 system-ui,sans-serif;cursor:pointer}",
      ".fp-context-feature{border-left:3px solid #5f7f65}",
      ".fp-context-wireframe{border-left:3px solid #7d6fa0}",
      ".fp-context-report{border-left:3px solid #a06f55}",
      ".fp-row{padding:2px 0}",
      ".fp-feature{font-size:1.05em;margin-bottom:8px}",
      ".fp-section{margin-top:12px;color:#1d1d1d;font-weight:600}",
      ".fp-kw{color:#000}",
      ".fp-step-kw{color:#6a4c1f;font-weight:700}",
      ".fp-comment,.fp-tag{color:#666}",
      ".fp-text{color:#333;padding-left:16px}",
      ".fp-loading,.fp-error{font:14px/1.5 system-ui,sans-serif;color:#444}",
      "body.fp-no-scroll{overflow:hidden}",
      ".fp-page-context{margin:16px 0 24px;padding:14px 16px;border:1px solid #d9d2c2;border-radius:12px;background:#fcfaf2}",
      ".fp-page-context-title{font:700 12px/1.2 system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#5e574a;margin-bottom:10px}",
      ".fp-breadcrumbs,.wireframe-page .topbar .meta{display:flex;flex-wrap:wrap;gap:8px;align-items:center}",
      ".fp-breadcrumbs a,.wireframe-page .topbar .meta a{color:#3b4c67;text-decoration:none}",
      ".fp-breadcrumb-sep{color:#8b867a}",
      ".fp-enhanced-toolbar{max-width:1220px;margin:18px auto 16px;padding:0 22px;display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap}",
      ".fp-toolbar-links{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end}",
      "@media (max-width: 900px){.fp-enhanced-toolbar{padding:0 16px}.fp-toolbar-links{justify-content:flex-start}}",
    ].join("");
    document.head.appendChild(style);
  }

  function ensureModal() {
    var existing = document.getElementById("feature-preview-modal");
    if (existing) return existing;
    var modal = document.createElement("div");
    modal.id = "feature-preview-modal";
    modal.className = "fp-modal";
    modal.innerHTML = [
      '<div class="fp-backdrop"></div>',
      '<div class="fp-panel" role="dialog" aria-modal="true" aria-label="Feature preview">',
      '  <div class="fp-top">',
      '    <div class="fp-title"></div>',
      '    <button type="button" class="fp-close">Close</button>',
      "  </div>",
      '  <div class="fp-body"></div>',
      "</div>",
    ].join("");
    modal.querySelector(".fp-backdrop").addEventListener("click", closeModal);
    modal.querySelector(".fp-close").addEventListener("click", closeModal);
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeModal();
    });
    document.body.appendChild(modal);
    return modal;
  }

  function closeModal() {
    var modal = document.getElementById("feature-preview-modal");
    if (!modal) return;
    modal.classList.remove("open");
    document.body.classList.remove("fp-no-scroll");
  }

  function openFeature(name) {
    var featureName = filename(name);
    var modal = ensureModal();
    var body = modal.querySelector(".fp-body");
    var title = modal.querySelector(".fp-title");
    title.textContent = displayName(featureName);
    body.innerHTML = '<div class="fp-loading">Loading feature…</div>';
    modal.classList.add("open");
    document.body.classList.add("fp-no-scroll");

    if (window.location.protocol === "file:") {
      body.innerHTML =
        '<div class="fp-error">Feature preview is available when this folder is served over HTTP.</div>';
      return;
    }

    fetch(attr("data-feature-base", "../features/") + featureName)
      .then(function (response) {
        if (!response.ok) throw new Error("HTTP " + response.status);
        return response.text();
      })
      .then(function (text) {
        body.innerHTML = renderGherkin(text, featureName);
      })
      .catch(function () {
        body.innerHTML =
          '<div class="fp-error">Could not load <code>' +
          escapeHtml(displayName(featureName)) +
          "</code>.</div>";
      });
  }

  function wireDocumentRefs() {
    document.querySelectorAll("code").forEach(function (node) {
      if (node.closest("pre, script")) return;
      var text = (node.textContent || "").trim();
      if (!/\.(feature|html|md)$/i.test(text)) return;
      if (node.classList.contains("doc-ref-chip")) return;

      var kind = classify(text);
      node.classList.add("doc-ref-chip", kind + "-ref-chip");
      node.classList.toggle("doc-ref-chip-doc", kind === "doc");
      node.setAttribute("role", "button");
      node.setAttribute("tabindex", "0");
      node.setAttribute("title", text);
      node.textContent = displayName(text);

      function activate() {
        if (kind === "feature") openFeature(text);
        else window.location.href = hrefFor(text);
      }

      node.addEventListener("click", activate);
      node.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          activate();
        }
      });
    });
  }

  function normalizeLinkLabels() {
    document.querySelectorAll("a").forEach(function (node) {
      var text = (node.textContent || "").trim();
      if (!text) return;
      if (!/\.(html|feature|md)$/i.test(text)) return;
      node.textContent = displayNameFromHref(
        node.getAttribute("href") || text,
        text,
      );
      node.setAttribute("title", text);
    });
  }

  ready(function () {
    ensureStyles();
    ensureModal();
    normalizeLinkLabels();
    enhanceCurrentPageNavigation();
    wireDocumentRefs();
    document.body.addEventListener("click", function (event) {
      var btn = event.target.closest("[data-feature-ref]");
      if (!btn) return;
      openFeature(btn.getAttribute("data-feature-ref"));
    });
  });
})();
