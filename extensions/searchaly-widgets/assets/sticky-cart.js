/*
 * Searchaly Boost — Sticky Add to Cart widget.
 *
 * Renders a fixed bar mirroring the product page's variant + quantity and posts to
 * the storefront Cart AJAX API. Theme-agnostic: reads the selected variant from the
 * product form's `[name="id"]` and fetches `/products/{handle}.js` for title/price.
 * Fails safe — off product pages or without a product form, it renders nothing.
 */
(function () {
  "use strict";
  if (!window.Searchaly) return;

  window.Searchaly.register("sticky-cart", function (cfg) {
    var global = cfg.global || {};

    // Product pages only.
    var handleMatch = window.location.pathname.match(/\/products\/([^\/?#]+)/);
    if (!handleMatch) return;

    var form = document.querySelector('form[action*="/cart/add"]');
    if (!form) return;

    var idInput = form.querySelector('[name="id"]');
    var product = null;
    var quantity = 1;

    // --- Build the bar -----------------------------------------------------
    var bar = document.createElement("div");
    bar.className = "searchaly-sticky";
    window.Searchaly.applyTheme(bar, global);

    var info = document.createElement("div");
    info.className = "searchaly-sticky__info";
    var titleEl = document.createElement("span");
    titleEl.className = "searchaly-sticky__title";
    titleEl.textContent = document.title;
    var priceEl = document.createElement("span");
    priceEl.className = "searchaly-sticky__price";
    info.appendChild(titleEl);
    info.appendChild(priceEl);
    bar.appendChild(info);

    var qtyWrap = null;
    var qtyValue = null;
    if (cfg.showQuantity) {
      qtyWrap = document.createElement("div");
      qtyWrap.className = "searchaly-sticky__qty";
      var dec = button("−");
      qtyValue = document.createElement("input");
      qtyValue.type = "number";
      qtyValue.min = "1";
      qtyValue.value = "1";
      qtyValue.setAttribute("aria-label", "Quantity");
      var inc = button("+");
      dec.addEventListener("click", function () {
        quantity = Math.max(1, quantity - 1);
        qtyValue.value = String(quantity);
      });
      inc.addEventListener("click", function () {
        quantity = quantity + 1;
        qtyValue.value = String(quantity);
      });
      qtyValue.addEventListener("change", function () {
        quantity = Math.max(1, parseInt(qtyValue.value, 10) || 1);
        qtyValue.value = String(quantity);
      });
      qtyWrap.appendChild(dec);
      qtyWrap.appendChild(qtyValue);
      qtyWrap.appendChild(inc);
      bar.appendChild(qtyWrap);
    }

    var cta = document.createElement("button");
    cta.className = "searchaly-sticky__cta";
    cta.type = "button";
    cta.textContent = cfg.ctaText || "Add to cart";
    bar.appendChild(cta);

    var buyNow = null;
    if (cfg.showBuyNow) {
      buyNow = document.createElement("button");
      buyNow.className = "searchaly-sticky__buynow";
      buyNow.type = "button";
      buyNow.textContent = "Buy now";
      bar.appendChild(buyNow);
    }

    document.body.appendChild(bar);

    // --- Data --------------------------------------------------------------
    function currentVariantId() {
      if (idInput && idInput.value) return idInput.value;
      if (product && product.variants && product.variants[0]) {
        return String(product.variants[0].id);
      }
      return null;
    }

    function currentVariant() {
      if (!product || !product.variants) return null;
      var id = currentVariantId();
      for (var i = 0; i < product.variants.length; i++) {
        if (String(product.variants[i].id) === String(id)) return product.variants[i];
      }
      return null;
    }

    function renderVariant() {
      var v = currentVariant();
      if (v) {
        priceEl.textContent = window.Searchaly.money(v.price);
        cta.disabled = v.available === false;
        if (v.available === false) cta.textContent = "Sold out";
        else cta.textContent = cfg.ctaText || "Add to cart";
      } else {
        priceEl.textContent = "";
      }
    }

    fetch("/products/" + handleMatch[1] + ".js", {
      headers: { Accept: "application/json" },
    })
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .then(function (p) {
        product = p;
        if (p && p.title) titleEl.textContent = p.title;
        renderVariant();
      })
      .catch(function () {
        /* price stays hidden; bar still works via idInput */
      });

    // Keep the sticky bar in sync when the theme changes the selected variant.
    form.addEventListener("change", renderVariant);

    // --- Actions -----------------------------------------------------------
    function addToCart(redirectTo) {
      var id = currentVariantId();
      if (!id) return;
      cta.disabled = true;
      var original = cta.textContent;
      cta.textContent = "Adding…";
      fetch("/cart/add.js", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ id: id, quantity: quantity }),
      })
        .then(function (r) {
          return r.json().then(function (body) {
            return { ok: r.ok, body: body };
          });
        })
        .then(function (res) {
          if (!res.ok) {
            cta.disabled = false;
            cta.textContent = original;
            return;
          }
          window.location.href = redirectTo;
        })
        .catch(function () {
          cta.disabled = false;
          cta.textContent = original;
        });
    }

    cta.addEventListener("click", function () {
      addToCart("/cart");
    });
    if (buyNow) {
      buyNow.addEventListener("click", function () {
        addToCart("/checkout");
      });
    }

    // --- Visibility --------------------------------------------------------
    if (!cfg.showAfterScroll) {
      requestAnimationFrame(function () {
        bar.classList.add("is-visible");
      });
    } else {
      var anchor =
        form.querySelector('[type="submit"]') ||
        form.querySelector('[name="add"]') ||
        form;
      if (!("IntersectionObserver" in window)) {
        bar.classList.add("is-visible");
      } else {
        var io = new IntersectionObserver(
          function (entries) {
            for (var i = 0; i < entries.length; i++) {
              if (entries[i].isIntersecting) bar.classList.remove("is-visible");
              else bar.classList.add("is-visible");
            }
          },
          { threshold: 0 },
        );
        io.observe(anchor);
      }
    }

    function button(label) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = label;
      b.tabIndex = -1;
      return b;
    }
  });
})();
