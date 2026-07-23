/*
 * Searchaly Boost — Announcement Bar.
 * Rotating messages, optional link, optional live countdown, optional dismiss.
 * The dismiss state is keyed to the announcement's CONTENT, so publishing a new
 * message re-shows the bar even to shoppers who dismissed the previous one.
 */
(function () {
  "use strict";
  if (!window.Searchaly) return;

  function pad(n) {
    return (n < 10 ? "0" : "") + n;
  }
  function isSafeUrl(u) {
    return typeof u === "string" && (/^https?:\/\//i.test(u) || u.charAt(0) === "/");
  }
  function hashStr(s) {
    var h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    return h.toString(36);
  }

  window.Searchaly.register("announcement-bar", function (cfg) {
    var S = window.Searchaly;
    var global = cfg.global || {};
    var messages = (cfg.messages || []).filter(function (m) {
      return m && String(m).trim().length > 0;
    });
    if (!messages.length) return;

    var DISMISS_KEY =
      "searchaly-announcement-dismissed-" +
      hashStr(JSON.stringify({ m: messages, c: cfg.countdownTo || "", l: cfg.link || "" }));
    try {
      if (cfg.dismissible && sessionStorage.getItem(DISMISS_KEY) === "1") return;
    } catch (e) {
      /* sessionStorage unavailable */
    }

    var bar = document.createElement("div");
    bar.className = "searchaly-bar searchaly-bar--announcement";
    S.applyTheme(bar, global);

    var inner = document.createElement("div");
    inner.className = "searchaly-bar__text";
    bar.appendChild(inner);

    var countdownEl = null;
    if (cfg.countdownTo) {
      countdownEl = document.createElement("span");
      countdownEl.className = "searchaly-bar__countdown";
      var end = new Date(cfg.countdownTo).getTime();
      var tick = function () {
        var diff = end - Date.now();
        if (!isFinite(end) || diff <= 0) {
          countdownEl.textContent = " · 00:00:00:00";
          if (timer) clearInterval(timer);
          return;
        }
        countdownEl.textContent =
          " · " +
          pad(Math.floor(diff / 86400000)) +
          ":" +
          pad(Math.floor((diff % 86400000) / 3600000)) +
          ":" +
          pad(Math.floor((diff % 3600000) / 60000)) +
          ":" +
          pad(Math.floor((diff % 60000) / 1000));
      };
      var timer = setInterval(tick, 1000);
      tick();
    }

    var safeLink = isSafeUrl(cfg.link) ? cfg.link : "";
    function setMessage(text) {
      while (inner.firstChild) inner.removeChild(inner.firstChild);
      var node = safeLink ? document.createElement("a") : document.createElement("span");
      if (safeLink) node.href = safeLink;
      node.textContent = text;
      inner.appendChild(node);
      if (countdownEl) inner.appendChild(countdownEl);
    }

    var idx = 0;
    var rotateTimer = null;
    setMessage(messages[0]);
    if (messages.length > 1) {
      rotateTimer = setInterval(function () {
        idx = (idx + 1) % messages.length;
        setMessage(messages[idx]);
      }, Math.max(1000, Number(cfg.rotateMs) || 4000));
    }

    if (cfg.dismissible) {
      var close = document.createElement("button");
      close.className = "searchaly-bar__close";
      close.type = "button";
      close.setAttribute("aria-label", "Dismiss");
      close.textContent = "×";
      close.addEventListener("click", function () {
        if (rotateTimer) clearInterval(rotateTimer);
        if (timer) clearInterval(timer);
        if (bar.parentNode) bar.parentNode.removeChild(bar);
        try {
          sessionStorage.setItem(DISMISS_KEY, "1");
        } catch (e) {
          /* ignore */
        }
      });
      bar.appendChild(close);
    }

    document.body.appendChild(bar);
    S.stack(bar);
    requestAnimationFrame(function () {
      bar.classList.add("is-visible");
    });
  });
})();
