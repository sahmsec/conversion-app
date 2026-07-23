/*
 * Searchaly Boost — Sales Pop.
 * Real recent-order social proof. Fetches the shop's latest orders from the app
 * proxy (product + coarse location only, no PII) and cycles small corner popups.
 */
(function () {
  "use strict";
  if (!window.Searchaly) return;

  window.Searchaly.register("sales-pop", function (cfg) {
    var S = window.Searchaly;

    var interval = (Number(cfg.intervalSeconds) || 8) * 1000;
    var duration = (Number(cfg.durationSeconds) || 5) * 1000;
    var maxPops = Number(cfg.maxPerSession);
    if (!isFinite(maxPops)) maxPops = 8;
    var showLocation = cfg.showLocation !== false;
    var showTimeAgo = cfg.showTimeAgo !== false;
    var template = cfg.template || "Someone in {{location}} purchased {{product}}";
    var corner = cfg.corner === "right" ? "right" : "left";

    var pop = document.createElement("div");
    pop.className = "searchaly-pop searchaly-pop--" + corner;
    pop.setAttribute("role", "status");
    pop.setAttribute("aria-live", "polite");
    if (cfg.global && cfg.global.colors && cfg.global.colors.accent) {
      pop.style.setProperty("--sa-accent", cfg.global.colors.accent);
    }

    var body = document.createElement("div");
    body.className = "searchaly-pop__body";
    var textEl = document.createElement("div");
    textEl.className = "searchaly-pop__text";
    var metaEl = document.createElement("div");
    metaEl.className = "searchaly-pop__meta";
    body.appendChild(textEl);
    body.appendChild(metaEl);

    var close = document.createElement("button");
    close.className = "searchaly-pop__close";
    close.setAttribute("type", "button");
    close.setAttribute("aria-label", "Dismiss");
    close.textContent = "×";

    pop.appendChild(body);
    pop.appendChild(close);
    document.body.appendChild(pop);

    var sales = [];
    var idx = 0;
    var shown = 0;
    var stopped = false;
    var hideTimer = null;
    var nextTimer = null;

    close.addEventListener("click", function () {
      stopped = true;
      clearTimeout(hideTimer);
      clearTimeout(nextTimer);
      hide();
    });

    function relTime(iso) {
      var t = Date.parse(iso);
      if (!isFinite(t)) return "";
      var secs = Math.max(1, Math.floor((Date.now() - t) / 1000));
      if (secs < 90) return "just now";
      var mins = Math.floor(secs / 60);
      if (mins < 60) return mins + (mins === 1 ? " minute ago" : " minutes ago");
      var hrs = Math.floor(mins / 60);
      if (hrs < 24) return hrs + (hrs === 1 ? " hour ago" : " hours ago");
      var days = Math.floor(hrs / 24);
      return days + (days === 1 ? " day ago" : " days ago");
    }

    function locationOf(sale) {
      var parts = [];
      if (sale.city) parts.push(sale.city);
      if (sale.region) parts.push(sale.region);
      return parts.join(", ");
    }

    function render(sale) {
      var loc = showLocation ? locationOf(sale) : "";
      if (!loc) loc = "your area";
      textEl.textContent = S.fill(template, { product: sale.product, location: loc });
      var r = showTimeAgo ? relTime(sale.at) : "";
      metaEl.textContent = r;
      metaEl.style.display = r ? "" : "none";
    }

    function show() {
      requestAnimationFrame(function () {
        pop.classList.add("is-visible");
      });
    }
    function hide() {
      pop.classList.remove("is-visible");
    }

    function cycle() {
      if (stopped || !sales.length) return;
      if (maxPops > 0 && shown >= maxPops) return;
      render(sales[idx % sales.length]);
      idx++;
      shown++;
      show();
      hideTimer = setTimeout(function () {
        hide();
        nextTimer = setTimeout(cycle, interval);
      }, duration);
    }

    fetch("/apps/searchaly/recent-sales", { headers: { Accept: "application/json" } })
      .then(function (r) {
        return r.ok ? r.json() : [];
      })
      .then(function (data) {
        sales = (Array.isArray(data) ? data : []).filter(function (s) {
          return s && typeof s.product === "string" && s.product;
        });
        if (sales.length && !stopped) {
          // First pop shortly after load, then on the configured cadence.
          nextTimer = setTimeout(cycle, Math.min(interval, 3000));
        }
      })
      .catch(function () {
        /* no social proof available — stay silent */
      });
  });
})();
