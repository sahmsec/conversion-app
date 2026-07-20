/*
 * Searchaly Boost — shared storefront runtime.
 *
 * Loaded first (defer, before widget scripts). Parses the injected config,
 * evaluates the global gates every widget shares (device visibility + scheduling),
 * and exposes a tiny registry so each widget ships only its own behavior:
 *
 *   window.Searchaly.register("sticky-cart", function (cfg) { ... });
 *
 * `cfg` is `{ global, ...widgetSpecificFields }`. register() only calls the
 * initializer when the widget is present in config AND passes the global gates.
 */
(function () {
  "use strict";

  var el = document.getElementById("searchaly-config");
  var config = {};
  if (el) {
    try {
      config = JSON.parse(el.textContent || "{}");
    } catch (e) {
      config = {};
    }
  }
  var widgets = (config && config.widgets) || {};

  function isMobile() {
    return !!(window.matchMedia && window.matchMedia("(max-width: 749px)").matches);
  }

  function deviceAllowed(global) {
    if (!global || !global.devices) return true;
    return isMobile() ? !!global.devices.mobile : !!global.devices.desktop;
  }

  function scheduleAllowed(global) {
    var s = global && global.schedule;
    if (!s) return true;
    var now = new Date();
    if (s.start) {
      var start = new Date(s.start + "T00:00:00");
      if (isFinite(start.getTime()) && now < start) return false;
    }
    if (s.end) {
      var end = new Date(s.end + "T23:59:59");
      if (isFinite(end.getTime()) && now > end) return false;
    }
    if (
      Object.prototype.toString.call(s.days) === "[object Array]" &&
      s.days.length > 0 &&
      s.days.indexOf(now.getDay()) === -1
    ) {
      return false;
    }
    return true;
  }

  function allowed(global) {
    return deviceAllowed(global) && scheduleAllowed(global);
  }

  function money(cents) {
    var amount = (Number(cents) || 0) / 100;
    try {
      var cur =
        window.Shopify && window.Shopify.currency && window.Shopify.currency.active;
      if (cur) {
        return new Intl.NumberFormat(undefined, {
          style: "currency",
          currency: cur,
        }).format(amount);
      }
    } catch (e) {
      /* fall through */
    }
    return "$" + amount.toFixed(2);
  }

  /** Apply the shared global styling as CSS custom properties on an element. */
  function applyTheme(node, global) {
    if (!global) return;
    var c = global.colors || {};
    var t = global.typography || {};
    var a = global.animation || {};
    if (c.bg) node.style.setProperty("--sa-bg", c.bg);
    if (c.text) node.style.setProperty("--sa-text", c.text);
    if (c.accent) node.style.setProperty("--sa-accent", c.accent);
    if (t.fontSize) node.style.setProperty("--sa-font-size", t.fontSize + "px");
    if (t.fontWeight) node.style.setProperty("--sa-font-weight", String(t.fontWeight));
    node.style.setProperty("--sa-anim", (a.speedMs != null ? a.speedMs : 200) + "ms");
    node.setAttribute("data-animation", a.type || "fade");
    node.setAttribute("data-position", global.position || "bottom");
  }

  var registry = {};

  var Searchaly = {
    config: config,
    allowed: allowed,
    money: money,
    applyTheme: applyTheme,
    register: function (key, initFn) {
      registry[key] = initFn;
      var cfg = widgets[key];
      if (!cfg) return;
      if (!allowed(cfg.global)) return;
      try {
        initFn(cfg);
      } catch (e) {
        if (window.console && window.console.error) {
          window.console.error("[Searchaly] " + key + " failed", e);
        }
      }
    },
  };

  window.Searchaly = Searchaly;
})();
