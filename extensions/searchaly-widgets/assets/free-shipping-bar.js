/*
 * Searchaly Boost — Free Shipping Bar.
 * Reads the live cart total and shows progress toward a free-shipping goal.
 * Re-renders on cart changes; converts the goal to the visitor's currency.
 */
(function () {
  "use strict";
  if (!window.Searchaly) return;

  window.Searchaly.register("free-shipping-bar", function (cfg) {
    var S = window.Searchaly;
    var global = cfg.global || {};
    if (global.dismissible && S.isDismissed("free-shipping-bar")) return;
    // goalCents is stored in the shop's primary currency; convert to presentment.
    var goal = S.toPresentment(Number(cfg.goalCents) || 0);

    var bar = document.createElement("div");
    bar.className = "searchaly-bar searchaly-bar--fsb";
    S.applyTheme(bar, global);

    var text = document.createElement("div");
    text.className = "searchaly-bar__text";
    bar.appendChild(text);

    var fill = null;
    if (cfg.showProgressBar) {
      var track = document.createElement("div");
      track.className = "searchaly-bar__track";
      fill = document.createElement("div");
      fill.className = "searchaly-bar__fill";
      track.appendChild(fill);
      bar.appendChild(track);
    }

    if (!S.mountInline(bar, "free-shipping-bar")) {
      document.body.appendChild(bar);
      S.stack(bar);
    }
    if (global.dismissible) S.addDismiss(bar, "free-shipping-bar");

    var goalTracked = false;
    function render(cart) {
      var total = cart ? Number(cart.total_price) || 0 : 0;
      var remaining = Math.max(0, goal - total);
      if (remaining <= 0 && !goalTracked) {
        goalTracked = true;
        S.track("free-shipping-bar", "goal");
      }
      text.textContent =
        remaining <= 0
          ? cfg.messageAfter
          : S.fill(cfg.messageBefore, { remaining: S.money(remaining) });
      if (fill) {
        var pct = goal > 0 ? Math.min(100, Math.round((total / goal) * 100)) : 100;
        fill.style.width = pct + "%";
      }
    }

    S.getCart().then(function (cart) {
      render(cart);
      requestAnimationFrame(function () {
        bar.classList.add("is-visible");
      });
    });

    document.addEventListener("searchaly:cart-updated", function () {
      S.getCart().then(render);
    });
  });
})();
