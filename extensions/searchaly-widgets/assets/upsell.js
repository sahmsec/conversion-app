/*
 * Searchaly Boost — Upsell / cross-sell.
 * On product pages, fetches Shopify's native product recommendations
 * (/recommendations/products.json) and renders a "you may also like" row/grid with
 * one-tap add-to-cart. Real recommendations — no manual product picking required.
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

  function productId() {
    try {
      var m = window.ShopifyAnalytics && window.ShopifyAnalytics.meta;
      return m && m.product && m.product.id;
    } catch (e) {
      return null;
    }
  }

  function firstVariant(p) {
    var vs = p.variants || [];
    for (var i = 0; i < vs.length; i++) {
      if (vs[i].available) return vs[i];
    }
    return vs[0] || null;
  }

  window.Searchaly.register("upsell", function (cfg) {
    if (!/\/products\/[^/?#]+/.test(window.location.pathname)) return;
    var pid = productId();
    if (!pid) return;

    var S = window.Searchaly;
    var intent = cfg.intent === "complementary" ? "complementary" : "related";
    var limit = Math.min(10, Math.max(1, Number(cfg.maxItems) || 4));
    var url =
      "/recommendations/products.json?product_id=" +
      encodeURIComponent(pid) +
      "&intent=" +
      intent +
      "&limit=" +
      limit;

    fetch(url, { headers: { Accept: "application/json" } })
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .then(function (data) {
        var products = (data && data.products) || [];
        if (products.length) render(products, cfg, S);
      })
      .catch(function () {
        /* recommendations unavailable — stay silent */
      });
  });

  function render(products, cfg, S) {
    var wrap = document.createElement("div");
    wrap.className = "searchaly-upsell searchaly-upsell--" + (cfg.layout === "grid" ? "grid" : "row");
    if (cfg.global && cfg.global.colors && cfg.global.colors.accent) {
      wrap.style.setProperty("--sa-accent", cfg.global.colors.accent);
    }

    if (cfg.heading) {
      var h = document.createElement("div");
      h.className = "searchaly-upsell__heading";
      h.textContent = cfg.heading;
      wrap.appendChild(h);
    }

    var list = document.createElement("div");
    list.className = "searchaly-upsell__list";

    products.forEach(function (p) {
      var v = firstVariant(p);
      if (!v) return;

      var card = document.createElement("div");
      card.className = "searchaly-upsell__card";

      var link = document.createElement("a");
      link.className = "searchaly-upsell__link";
      link.href = p.url || "#";
      if (p.featured_image) {
        var img = document.createElement("img");
        img.className = "searchaly-upsell__img";
        img.src = p.featured_image;
        img.alt = p.title || "";
        img.loading = "lazy";
        link.appendChild(img);
      }
      var title = document.createElement("div");
      title.className = "searchaly-upsell__title";
      title.textContent = p.title || "";
      link.appendChild(title);
      card.appendChild(link);

      var price = document.createElement("div");
      price.className = "searchaly-upsell__price";
      price.textContent = S.money(p.price);
      card.appendChild(price);

      var btn = document.createElement("button");
      btn.className = "searchaly-upsell__add";
      btn.type = "button";
      var label = cfg.ctaText || "Add";
      btn.textContent = label;
      btn.addEventListener("click", function () {
        btn.disabled = true;
        S.track("upsell", "click");
        fetch("/cart/add.js", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ items: [{ id: v.id, quantity: 1 }] }),
        })
          .then(function (r) {
            // /cart/add.js returns 422 (e.g. sold out) without rejecting the promise,
            // so gate on the status — never claim "Added" for a failed add.
            if (!r.ok) throw new Error("add-to-cart failed");
            btn.textContent = "Added ✓";
            setTimeout(function () {
              btn.disabled = false;
              btn.textContent = label;
            }, 1500);
          })
          .catch(function () {
            btn.textContent = "Unavailable";
            setTimeout(function () {
              btn.disabled = false;
              btn.textContent = label;
            }, 1800);
          });
      });
      card.appendChild(btn);

      list.appendChild(card);
    });

    wrap.appendChild(list);

    // Placed via a block? Render there. Otherwise auto-place below the buy section.
    if (S.mountInline(wrap, "upsell")) return;
    var form = findProductForm();
    if (form && form.parentNode) {
      form.parentNode.insertBefore(wrap, form.nextSibling);
    } else {
      document.body.appendChild(wrap);
    }
  }
})();
