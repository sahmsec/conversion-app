/*
 * Searchaly Boost — inline spend-goal renderer (for the app-BLOCK versions of the
 * Free Shipping Bar and Cart Goal). Self-contained: works whether or not the app
 * embed / core.js is loaded. Reads config from the block's data-* attributes.
 */
(function () {
  "use strict";

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

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

  // Fire searchaly:cart-updated on cart mutations even if core.js isn't present.
  if (window.fetch && !window.__searchalyFetchPatched) {
    window.__searchalyFetchPatched = true;
    var _f = window.fetch;
    window.fetch = function (input) {
      var u = typeof input === "string" ? input : (input && (input.url || input.href)) || "";
      return _f.apply(this, arguments).then(function (res) {
        if (/\/cart\/(add|change|update|clear)(\.js)?([?#]|$)/i.test(u)) {
          cartPromise = null;
          try {
            document.dispatchEvent(new CustomEvent("searchaly:cart-updated"));
          } catch (e) {}
        }
        return res;
      });
    };
  }

  function money(cents) {
    var a = (Number(cents) || 0) / 100;
    try {
      var c = window.Shopify && window.Shopify.currency && window.Shopify.currency.active;
      if (c) return new Intl.NumberFormat(undefined, { style: "currency", currency: c }).format(a);
    } catch (e) {}
    return "$" + a.toFixed(2);
  }
  function rate() {
    try {
      var r = window.Shopify && window.Shopify.currency && window.Shopify.currency.rate;
      return r ? parseFloat(r) || 1 : 1;
    } catch (e) {
      return 1;
    }
  }
  // Block settings can't contain {{ }} (theme-check), so inline blocks use [token].
  function fill(t, tokens) {
    return String(t == null ? "" : t).replace(/\[(\w+)\]/g, function (m, k) {
      return Object.prototype.hasOwnProperty.call(tokens, k) ? tokens[k] : m;
    });
  }

  function build(el) {
    var goal = Math.round((parseFloat(el.getAttribute("data-goal")) || 0) * rate());
    var before = el.getAttribute("data-before") || "";
    var after = el.getAttribute("data-after") || "";
    var reward = el.getAttribute("data-reward") || "";
    var showBar = el.getAttribute("data-progress") === "true";

    var text = document.createElement("div");
    text.className = "searchaly-inline-bar__text";
    el.appendChild(text);

    var fillEl = null;
    if (showBar) {
      var track = document.createElement("div");
      track.className = "searchaly-inline-bar__track";
      fillEl = document.createElement("div");
      fillEl.className = "searchaly-inline-bar__fill";
      track.appendChild(fillEl);
      el.appendChild(track);
    }

    function render(cart) {
      var total = cart ? Number(cart.total_price) || 0 : 0;
      var remaining = Math.max(0, goal - total);
      text.textContent =
        remaining <= 0
          ? fill(after, { reward: reward })
          : fill(before, { remaining: money(remaining), reward: reward });
      if (fillEl) {
        fillEl.style.width = (goal > 0 ? Math.min(100, Math.round((total / goal) * 100)) : 100) + "%";
      }
    }

    getCart().then(render);
    document.addEventListener("searchaly:cart-updated", function () {
      getCart().then(render);
    });
  }

  ready(function () {
    var els = document.querySelectorAll("[data-searchaly-inline-bar]");
    for (var i = 0; i < els.length; i++) build(els[i]);
  });
})();
