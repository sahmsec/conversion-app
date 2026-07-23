/*
 * Searchaly Boost — Quantity Breaks (volume discount) product-page table.
 * Shows the tier table near the buy button on product pages. The actual discount
 * is enforced at checkout by our Shopify discount function — this table is the
 * shopper-facing "buy more, save more" nudge.
 */
(function () {
  "use strict";
  if (!window.Searchaly) return;

  var NOISE =
    '[data-recommend],[data-recommendations],.recommendations,.product-recommendations,' +
    '[id*="recommend"],.related-products,[data-recently-viewed],[id*="recently-viewed"],' +
    'quick-add-modal,.quick-add,.card-wrapper';

  function findProductForm() {
    var forms = document.querySelectorAll('form[action*="/cart/add"]');
    if (!forms.length) return null;
    for (var i = 0; i < forms.length; i++) {
      if (!forms[i].closest(NOISE)) return forms[i];
    }
    return forms[0];
  }

  window.Searchaly.register("quantity-breaks", function (cfg) {
    if (!/\/products\/[^/?#]+/.test(window.location.pathname)) return;

    var tiers = (cfg.tiers || []).filter(function (t) {
      return t && Number(t.minQuantity) > 0 && Number(t.percent) > 0;
    });
    if (!tiers.length) return;
    tiers.sort(function (a, b) {
      return a.minQuantity - b.minQuantity;
    });

    var form = findProductForm();
    if (!form) return;

    var accent = (cfg.global && cfg.global.colors && cfg.global.colors.accent) || "#4f46e5";
    var bestPercent = tiers.reduce(function (m, t) {
      return Math.max(m, Number(t.percent));
    }, 0);

    var wrap = document.createElement("div");
    wrap.className = "searchaly-qb";

    if (cfg.heading) {
      var h = document.createElement("div");
      h.className = "searchaly-qb__heading";
      h.textContent = cfg.heading;
      wrap.appendChild(h);
    }

    var list = document.createElement("div");
    list.className = "searchaly-qb__list";
    tiers.forEach(function (t) {
      var row = document.createElement("div");
      row.className = "searchaly-qb__row";
      var highlight = cfg.highlightBest && Number(t.percent) === bestPercent;
      if (highlight) {
        row.className += " is-best";
        row.style.borderColor = accent;
        row.style.background = accent + "12";
      }
      var left = document.createElement("span");
      left.className = "searchaly-qb__qty";
      left.textContent = "Buy " + t.minQuantity + "+";
      var right = document.createElement("span");
      right.className = "searchaly-qb__save";
      right.textContent = "Save " + t.percent + "%";
      if (highlight) right.style.color = accent;
      row.appendChild(left);
      row.appendChild(right);
      list.appendChild(row);
    });
    wrap.appendChild(list);

    var anchor = form.querySelector(
      '.product-form__buttons,.product-form__submit,[type="submit"],[name="add"]',
    );
    if (anchor && anchor.parentNode) {
      anchor.parentNode.insertBefore(wrap, anchor.nextSibling);
    } else {
      form.appendChild(wrap);
    }
  });
})();
