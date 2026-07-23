/*
 * Searchaly Boost — Countdown / urgency timer bar.
 *  - fixed:     counts down to a specific date/time.
 *  - evergreen: a per-visitor timer of N minutes (persisted so it survives reloads).
 * The {{timer}} token in the message is replaced live each second.
 */
(function () {
  "use strict";
  if (!window.Searchaly) return;

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
  function hashStr(s) {
    var h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    return h.toString(36);
  }

  window.Searchaly.register("countdown", function (cfg) {
    var S = window.Searchaly;
    var global = cfg.global || {};
    if (global.dismissible && S.isDismissed("countdown")) return;

    var end;
    if (cfg.mode === "evergreen") {
      var mins = Number(cfg.durationMinutes) || 60;
      var key = "searchaly-countdown-" + hashStr(JSON.stringify({ m: cfg.message, d: mins }));
      var stored = null;
      try {
        stored = localStorage.getItem(key);
      } catch (e) {}
      if (stored) {
        end = parseInt(stored, 10);
      } else {
        end = Date.now() + mins * 60000;
        try {
          localStorage.setItem(key, String(end));
        } catch (e) {}
      }
    } else {
      end = cfg.endAt ? new Date(cfg.endAt).getTime() : NaN;
    }
    if (!isFinite(end)) return; // fixed mode with no valid date

    var bar = document.createElement("div");
    bar.className = "searchaly-bar searchaly-bar--countdown";
    S.applyTheme(bar, global);
    var text = document.createElement("div");
    text.className = "searchaly-bar__text";
    bar.appendChild(text);
    if (!S.mountInline(bar, "countdown")) {
      document.body.appendChild(bar);
      S.stack(bar);
    }
    if (global.dismissible) S.addDismiss(bar, "countdown");
    requestAnimationFrame(function () {
      bar.classList.add("is-visible");
    });

    var timer;
    function render() {
      var diff = end - Date.now();
      if (diff <= 0) {
        if (timer) clearInterval(timer);
        if (cfg.hideOnExpire) {
          if (bar.parentNode) bar.parentNode.removeChild(bar);
        } else {
          text.textContent = cfg.expiredMessage || "";
        }
        return;
      }
      var msg = cfg.message || "";
      var timerStr = fmt(diff);
      text.textContent =
        msg.indexOf("{{timer}}") !== -1
          ? msg.replace(/\{\{\s*timer\s*\}\}/g, timerStr)
          : (msg + " " + timerStr).replace(/^\s+/, "");
    }
    render();
    timer = setInterval(render, 1000);
  });
})();
