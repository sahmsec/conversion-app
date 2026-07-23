/*
 * Searchaly Boost — shared storefront runtime.
 *
 * Loaded first (defer, before widget scripts). Parses the injected config,
 * evaluates the global gates every widget shares (device visibility + scheduling
 * in the STORE's timezone), detects cart mutations (fetch + XHR), stacks fixed
 * bars so they don't cover each other, and exposes a registry so each widget ships
 * only its own behavior:  window.Searchaly.register("sticky-cart", fn)
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
  var storeTz = config && config.tz; // IANA timezone of the store (may be undefined)

  // --- Device + schedule gates ---------------------------------------------
  function isMobile() {
    return !!(window.matchMedia && window.matchMedia("(max-width: 749px)").matches);
  }
  function deviceAllowed(global) {
    if (!global || !global.devices) return true;
    return isMobile() ? !!global.devices.mobile : !!global.devices.desktop;
  }

  // Current date (YYYY-MM-DD) + day-of-week in the STORE timezone, so schedules
  // fire at the same wall-clock time for every visitor regardless of their locale.
  function storeDateInfo() {
    var now = new Date();
    if (storeTz) {
      try {
        var dateStr = new Intl.DateTimeFormat("en-CA", {
          timeZone: storeTz,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(now);
        var wd = new Intl.DateTimeFormat("en-US", {
          timeZone: storeTz,
          weekday: "short",
        }).format(now);
        var dow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(wd);
        return { dateStr: dateStr, dow: dow };
      } catch (e) {
        /* fall through to local */
      }
    }
    var mm = String(now.getMonth() + 1);
    var dd = String(now.getDate());
    return {
      dateStr:
        now.getFullYear() +
        "-" +
        (mm.length < 2 ? "0" + mm : mm) +
        "-" +
        (dd.length < 2 ? "0" + dd : dd),
      dow: now.getDay(),
    };
  }

  function scheduleAllowed(global) {
    var s = global && global.schedule;
    if (!s) return true;
    var info = storeDateInfo();
    // start/end are date-only "YYYY-MM-DD"; lexicographic compare == date compare.
    if (s.start && info.dateStr < s.start) return false;
    if (s.end && info.dateStr > s.end) return false;
    if (Object.prototype.toString.call(s.days) === "[object Array]") {
      if (s.days.length === 0) return false; // no active days selected -> never show
      if (s.days.indexOf(info.dow) === -1) return false;
    }
    return true;
  }

  // Current page type + product/collection handle, from the URL.
  function currentPage() {
    var path = window.location.pathname || "/";
    var prod = path.match(/\/products\/([^/?#]+)/);
    var coll = path.match(/\/collections\/([^/?#]+)/);
    var type;
    if (prod) type = "product";
    else if (path === "/" || path === "") type = "home";
    else if (coll) type = "collection";
    else if (path.indexOf("/cart") === 0) type = "cart";
    else type = "other";
    return {
      type: type,
      product: prod ? prod[1] : null,
      collection: type === "collection" && coll ? coll[1] : null,
    };
  }

  function isArr(v) {
    return Object.prototype.toString.call(v) === "[object Array]";
  }

  function pageAllowed(t) {
    if (!t) return true;
    var page = currentPage();
    var scope = t.pages || "all";
    if (scope !== "all" && scope !== page.type) return false;
    if (isArr(t.productHandles) && t.productHandles.length > 0 && page.product) {
      if (t.productHandles.indexOf(page.product) === -1) return false;
    }
    if (isArr(t.collectionHandles) && t.collectionHandles.length > 0 && page.collection) {
      if (t.collectionHandles.indexOf(page.collection) === -1) return false;
    }
    return true;
  }

  function geoAllowed(t) {
    if (!t || !isArr(t.countries) || t.countries.length === 0) return true;
    var country = null;
    try {
      country = window.Shopify && window.Shopify.country;
    } catch (e) {
      country = null;
    }
    if (!country) return true; // can't determine the country -> don't hide
    return t.countries.indexOf(String(country).toUpperCase()) !== -1;
  }

  function allowed(global) {
    var t = global && global.targeting;
    return (
      deviceAllowed(global) && scheduleAllowed(global) && pageAllowed(t) && geoAllowed(t)
    );
  }

  // --- Money ---------------------------------------------------------------
  function activeCurrency() {
    try {
      return window.Shopify && window.Shopify.currency && window.Shopify.currency.active;
    } catch (e) {
      return null;
    }
  }
  function money(cents) {
    var amount = (Number(cents) || 0) / 100;
    var cur = activeCurrency();
    if (cur) {
      try {
        return new Intl.NumberFormat(undefined, { style: "currency", currency: cur }).format(amount);
      } catch (e) {
        /* fall through */
      }
    }
    return "$" + amount.toFixed(2);
  }
  // Convert an amount stored in the shop's PRIMARY currency to the visitor's
  // PRESENTMENT currency (Shopify Markets), so spend-goal math compares like units.
  function toPresentment(cents) {
    var rate = 1;
    try {
      var r = window.Shopify && window.Shopify.currency && window.Shopify.currency.rate;
      if (r) rate = parseFloat(r) || 1;
    } catch (e) {
      /* ignore */
    }
    return Math.round((Number(cents) || 0) * rate);
  }

  // --- Cart mutation detection (fetch + XHR) -------------------------------
  var cartPromise = null;
  function getCart() {
    if (!cartPromise) {
      cartPromise = fetch("/cart.js", { headers: { Accept: "application/json" } })
        .then(function (r) {
          return r.ok ? r.json() : null;
        })
        .catch(function () {
          return null;
        });
    }
    return cartPromise;
  }

  // Verb must be followed by end / query / fragment / .js — so "/cart/add-ons"
  // and similar unrelated paths do NOT match.
  var CART_MUTATION = /\/cart\/(add|change|update|clear)(\.js)?([?#]|$)/i;
  function urlOf(input) {
    if (typeof input === "string") return input;
    if (input && typeof input.url === "string") return input.url; // Request
    if (input && typeof input.href === "string") return input.href; // URL
    try {
      return String(input);
    } catch (e) {
      return "";
    }
  }
  function notifyCartUpdate() {
    cartPromise = null;
    try {
      document.dispatchEvent(new CustomEvent("searchaly:cart-updated"));
    } catch (e) {
      /* CustomEvent unsupported */
    }
  }

  if (window.fetch && !window.__searchalyFetchPatched) {
    window.__searchalyFetchPatched = true;
    var _origFetch = window.fetch;
    window.fetch = function (input) {
      var u = urlOf(input);
      return _origFetch.apply(this, arguments).then(function (res) {
        if (CART_MUTATION.test(u)) notifyCartUpdate();
        return res;
      });
    };
  }
  if (window.XMLHttpRequest && !window.__searchalyXHRPatched) {
    window.__searchalyXHRPatched = true;
    var _open = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url) {
      try {
        this.__saCartMutation = CART_MUTATION.test(String(url || ""));
      } catch (e) {
        this.__saCartMutation = false;
      }
      return _open.apply(this, arguments);
    };
    var _send = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function () {
      if (this.__saCartMutation) {
        this.addEventListener("loadend", function () {
          notifyCartUpdate();
        });
      }
      return _send.apply(this, arguments);
    };
  }

  // --- Fixed-bar stacking --------------------------------------------------
  // Bars pinned to the same edge would otherwise overlap; keep a running offset
  // of visible bars per edge and recompute on show/hide + resize.
  var placed = [];
  function edgeOf(node) {
    return node.getAttribute("data-position") === "top" ? "top" : "bottom";
  }
  function restack() {
    var offsets = { top: 0, bottom: 0 };
    for (var i = 0; i < placed.length; i++) {
      var node = placed[i];
      var edge = edgeOf(node);
      // Floating forms (pill/boxed) sit slightly off the edge and stack with a gap.
      var form = node.getAttribute("data-form");
      var gap = form && form !== "bar" ? 14 : 0;
      node.style[edge] = offsets[edge] + gap + "px";
      if (node.classList.contains("is-visible")) {
        offsets[edge] += node.offsetHeight + gap;
      }
    }
  }
  function stack(node) {
    placed.push(node);
    restack();
    node.addEventListener("transitionend", restack);
  }
  if (window.addEventListener) window.addEventListener("resize", restack);

  // --- Inline placement (drag-and-drop blocks) ----------------------------
  // If the merchant dropped a placement block for this widget, render into it
  // (inline, in the page flow) instead of floating/auto-placing. Returns true if
  // it mounted into a slot. The widget's config still comes from the dashboard.
  function mountInline(node, key) {
    var slot = document.querySelector(
      '[data-searchaly-slot="' + key + '"]:not([data-searchaly-filled])',
    );
    if (!slot) return false;
    slot.setAttribute("data-searchaly-filled", "1");
    node.setAttribute("data-inline", "1");
    slot.appendChild(node);
    return true;
  }

  // --- Styling + tokens ----------------------------------------------------
  function applyTheme(node, global) {
    if (!global) return;
    var c = global.colors || {};
    var t = global.typography || {};
    var a = global.animation || {};
    var s = global.style || {};
    if (c.bg) node.style.setProperty("--sa-bg", c.bg);
    if (c.text) node.style.setProperty("--sa-text", c.text);
    if (c.accent) node.style.setProperty("--sa-accent", c.accent);
    if (t.fontSize) node.style.setProperty("--sa-font-size", t.fontSize + "px");
    if (t.fontWeight) node.style.setProperty("--sa-font-weight", String(t.fontWeight));
    node.style.setProperty("--sa-anim", (a.speedMs != null ? a.speedMs : 200) + "ms");
    node.setAttribute("data-animation", a.type || "fade");
    node.setAttribute("data-position", global.position || "bottom");
    // Shape / form factor
    var form = s.formFactor === "pill" || s.formFactor === "boxed" ? s.formFactor : "bar";
    node.setAttribute("data-form", form);
    node.style.setProperty("--sa-radius", (s.radius != null ? s.radius : 10) + "px");
    if (form !== "bar" && s.maxWidth) {
      node.style.setProperty("--sa-max-width", s.maxWidth + "px");
    }
    if (s.icon) {
      node.style.setProperty("--sa-icon", '"' + String(s.icon).replace(/"/g, "") + ' "');
      node.setAttribute("data-has-icon", "1");
    }
  }

  // Inject a widget's merchant-authored custom CSS once (their own store; CSS only).
  function injectCss(key, css) {
    if (!css) return;
    var id = "searchaly-css-" + key;
    if (document.getElementById(id)) return;
    var style = document.createElement("style");
    style.id = id;
    style.textContent = String(css);
    document.head.appendChild(style);
  }

  // Add a ✕ close control to a widget node; remembers dismissal for the session.
  function dismissKey(key) {
    return "searchaly-dismissed-" + key;
  }
  function isDismissed(key) {
    try {
      return sessionStorage.getItem(dismissKey(key)) === "1";
    } catch (e) {
      return false;
    }
  }
  function addDismiss(node, key) {
    node.classList.add("searchaly-has-dismiss");
    var btn = document.createElement("button");
    btn.className = "searchaly-bar__close";
    btn.type = "button";
    btn.setAttribute("aria-label", "Dismiss");
    btn.textContent = "×";
    btn.addEventListener("click", function () {
      node.classList.remove("is-visible");
      try {
        sessionStorage.setItem(dismissKey(key), "1");
      } catch (e) {
        /* ignore */
      }
      setTimeout(function () {
        if (node.parentNode) node.parentNode.removeChild(node);
        restack();
      }, 320);
    });
    node.appendChild(btn);
  }

  function fill(template, tokens) {
    return String(template == null ? "" : template).replace(
      /\{\{\s*(\w+)\s*\}\}/g,
      function (match, key) {
        return Object.prototype.hasOwnProperty.call(tokens, key) ? tokens[key] : match;
      },
    );
  }

  // --- Analytics -----------------------------------------------------------
  var eventQueue = [];
  var flushTimer = null;
  function flush() {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    if (!eventQueue.length) return;
    var body = JSON.stringify(eventQueue);
    eventQueue = [];
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          "/apps/searchaly/events",
          new Blob([body], { type: "application/json" }),
        );
      } else {
        fetch("/apps/searchaly/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: body,
          keepalive: true,
        });
      }
    } catch (e) {
      /* analytics is best-effort */
    }
  }
  function track(key, event) {
    eventQueue.push({ widget: key, event: event });
    if (!flushTimer) flushTimer = setTimeout(flush, 3000);
  }
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") flush();
  });
  window.addEventListener("pagehide", flush);

  // --- Registry ------------------------------------------------------------
  var registry = {};
  var Searchaly = {
    config: config,
    allowed: allowed,
    money: money,
    toPresentment: toPresentment,
    applyTheme: applyTheme,
    getCart: getCart,
    fill: fill,
    stack: stack,
    mountInline: mountInline,
    track: track,
    injectCss: injectCss,
    addDismiss: addDismiss,
    isDismissed: isDismissed,
    register: function (key, initFn) {
      registry[key] = initFn;
      var cfg = widgets[key];
      if (!cfg) return;
      if (!allowed(cfg.global)) return;
      if (cfg.global && cfg.global.customCss) injectCss(key, cfg.global.customCss);
      try {
        initFn(cfg);
        track(key, "impression");
      } catch (e) {
        if (window.console && window.console.error) {
          window.console.error("[Searchaly] " + key + " failed", e);
        }
      }
    },
  };

  window.Searchaly = Searchaly;
})();
