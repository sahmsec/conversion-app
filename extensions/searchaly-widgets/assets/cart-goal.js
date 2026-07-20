/*
 * Searchaly Boost — Cart Goal.
 * Like the Free Shipping Bar, but framed around unlocking a reward.
 * Re-renders when the cart changes (via the searchaly:cart-updated event).
 */
(function () {
  "use strict";
  if (!window.Searchaly) return;

  window.Searchaly.register("cart-goal", function (cfg) {
    var S = window.Searchaly;
    var global = cfg.global || {};
    var goal = Number(cfg.goalCents) || 0;

    var bar = document.createElement("div");
    bar.className = "searchaly-bar searchaly-bar--cart-goal";
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

    document.body.appendChild(bar);

    function render(cart) {
      var total = cart ? Number(cart.total_price) || 0 : 0;
      var remaining = Math.max(0, goal - total);
      text.textContent =
        remaining <= 0
          ? S.fill(cfg.messageAfter, { reward: cfg.reward })
          : S.fill(cfg.messageBefore, { remaining: S.money(remaining), reward: cfg.reward });
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
