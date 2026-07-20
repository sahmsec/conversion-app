/*
 * Searchaly Boost — Trust Badges.
 * Injects a row of payment/security badges into the product form, near the buy
 * button. Product pages only; renders nothing elsewhere.
 */
(function () {
  "use strict";
  if (!window.Searchaly) return;

  var BADGES = {
    visa: { label: "VISA", color: "#1a1f71" },
    mastercard: { label: "Mastercard", color: "#eb001b" },
    amex: { label: "AMEX", color: "#2e77bc" },
    paypal: { label: "PayPal", color: "#003087" },
    applepay: { label: "Apple Pay", color: "#000000" },
    googlepay: { label: "Google Pay", color: "#5f6368" },
    ssl: { label: "🔒 SSL Secure", color: "#1f7a3d" },
    moneyback: { label: "↩ Money-back", color: "#7a1f1f" },
  };

  window.Searchaly.register("trust-badges", function (cfg) {
    if (!/\/products\/[^/?#]+/.test(window.location.pathname)) return;
    var form = document.querySelector('form[action*="/cart/add"]');
    if (!form) return;

    var badges = cfg.badges || [];
    if (!badges.length) return;

    var wrap = document.createElement("div");
    wrap.className = "searchaly-trust searchaly-trust--" + (cfg.alignment || "center");

    if (cfg.heading) {
      var heading = document.createElement("div");
      heading.className = "searchaly-trust__heading";
      heading.textContent = cfg.heading;
      wrap.appendChild(heading);
    }

    var row = document.createElement("div");
    row.className = "searchaly-trust__row";
    for (var i = 0; i < badges.length; i++) {
      var meta = BADGES[badges[i]];
      if (!meta) continue;
      var chip = document.createElement("span");
      chip.className = "searchaly-trust__badge";
      chip.textContent = meta.label;
      chip.style.color = meta.color;
      row.appendChild(chip);
    }
    wrap.appendChild(row);
    form.appendChild(wrap);
  });
})();
