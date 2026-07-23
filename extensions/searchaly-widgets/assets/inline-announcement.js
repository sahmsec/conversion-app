/*
 * Searchaly Boost — inline announcement renderer (app-BLOCK version).
 * Self-contained: rotates the block's messages in place. Reads config from data-*.
 */
(function () {
  "use strict";

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  function build(el) {
    var msgs = [
      el.getAttribute("data-m1"),
      el.getAttribute("data-m2"),
      el.getAttribute("data-m3"),
    ].filter(function (m) {
      return m && m.trim().length > 0;
    });
    if (!msgs.length) return;

    var link = el.getAttribute("data-link") || "";
    var rotate = Math.max(1000, parseInt(el.getAttribute("data-rotate"), 10) || 4000);

    var inner = document.createElement(link ? "a" : "div");
    if (link) inner.href = link;
    inner.className = "searchaly-inline-announce__text";
    inner.textContent = msgs[0];
    el.appendChild(inner);

    if (msgs.length > 1) {
      var i = 0;
      setInterval(function () {
        i = (i + 1) % msgs.length;
        inner.textContent = msgs[i];
      }, rotate);
    }
  }

  ready(function () {
    var els = document.querySelectorAll("[data-searchaly-inline-announce]");
    for (var i = 0; i < els.length; i++) build(els[i]);
  });
})();
