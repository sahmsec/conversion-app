/*
 * Searchaly Boost — inline countdown renderer (app-BLOCK version).
 * Self-contained live timer. Reads the end date + message ([timer] token) from data-*.
 */
(function () {
  "use strict";

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  function pad(n) {
    return (n < 10 ? "0" : "") + n;
  }
  function fmt(ms) {
    if (ms < 0) ms = 0;
    var d = Math.floor(ms / 86400000);
    var h = Math.floor((ms % 86400000) / 3600000);
    var m = Math.floor((ms % 3600000) / 60000);
    var s = Math.floor((ms % 60000) / 1000);
    return (d > 0 ? pad(d) + ":" : "") + pad(h) + ":" + pad(m) + ":" + pad(s);
  }

  function build(el) {
    var end = Date.parse(el.getAttribute("data-end"));
    var msg = el.getAttribute("data-message") || "";
    var expired = el.getAttribute("data-expired") || "";

    var text = document.createElement("div");
    text.className = "searchaly-inline-countdown__text";
    el.appendChild(text);

    var timer = null;
    function render() {
      if (!isFinite(end)) {
        text.textContent = msg.replace(/\[timer\]/g, "");
        return;
      }
      var diff = end - Date.now();
      if (diff <= 0) {
        text.textContent = expired;
        if (timer) clearInterval(timer);
        return;
      }
      var ts = fmt(diff);
      text.textContent =
        msg.indexOf("[timer]") !== -1
          ? msg.replace(/\[timer\]/g, ts)
          : (msg + " " + ts).replace(/^\s+/, "");
    }
    render();
    timer = setInterval(render, 1000);
  }

  ready(function () {
    var els = document.querySelectorAll("[data-searchaly-inline-countdown]");
    for (var i = 0; i < els.length; i++) build(els[i]);
  });
})();
