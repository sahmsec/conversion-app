/*
 * Searchaly Boost — Sticky Add to Cart widget.
 *
 * Renders a fixed bar mirroring the product page's variant + quantity and posts to
 * the storefront Cart AJAX API. Product pages only; renders nothing elsewhere.
 */
(function () {
  "use strict";
  if (!window.Searchaly) return;

  // Containers that hold OTHER products' add-to-cart forms (recommendations, etc.).
  var NOISE =
    '[data-recommend],[data-recommendations],.recommendations,.product-recommendations,' +
    '[id*="recommend"],.related-products,[data-recently-viewed],[id*="recently-viewed"],' +
    'quick-add-modal,.quick-add,.card-wrapper';

  // Pick the MAIN product form, not the first /cart/add form on the page.
  function findProductForm() {
    var forms = document.querySelectorAll('form[action*="/cart/add"]');
    if (!forms.length) return null;
    if (forms.length === 1) return forms[0];
    var candidates = [];
    for (var i = 0; i < forms.length; i++) {
      if (!forms[i].closest(NOISE)) candidates.push(forms[i]);
    }
    var pool = candidates.length ? candidates : [forms[0]];
    // Prefer a form that lives in the main product section.
    for (var j = 0; j < pool.length; j++) {
      if (
        pool[j].closest('product-info,[id*="product-form"],[data-section-type="product"],main')
      ) {
        return pool[j];
      }
    }
    return pool[0];
  }

  window.Searchaly.register("sticky-cart", function (cfg) {
    var S = window.Searchaly;
    var global = cfg.global || {};

    if (!/\/products\/[^/?#]+/.test(window.location.pathname)) return;
    var handleMatch = window.location.pathname.match(/\/products\/([^/?#]+)/);
    var form = findProductForm();
    if (!form) return;

    var idInput = form.querySelector('[name="id"]');
    var product = null;
    var quantity = 1;
    var submitting = false;

    // --- DOM ---------------------------------------------------------------
    var bar = document.createElement("div");
    bar.className = "searchaly-sticky";
    S.applyTheme(bar, global);

    var errorEl = document.createElement("div");
    errorEl.className = "searchaly-sticky__error";
    errorEl.style.display = "none";
    bar.appendChild(errorEl);

    var row = document.createElement("div");
    row.className = "searchaly-sticky__row";
    bar.appendChild(row);

    var info = document.createElement("div");
    info.className = "searchaly-sticky__info";
    var titleEl = document.createElement("span");
    titleEl.className = "searchaly-sticky__title";
    titleEl.textContent = document.title;
    var priceEl = document.createElement("span");
    priceEl.className = "searchaly-sticky__price";
    info.appendChild(titleEl);
    info.appendChild(priceEl);
    row.appendChild(info);

    var qtyValue = null;
    if (cfg.showQuantity) {
      var qtyWrap = document.createElement("div");
      qtyWrap.className = "searchaly-sticky__qty";
      var dec = mkBtn("−");
      qtyValue = document.createElement("input");
      qtyValue.type = "number";
      qtyValue.min = "1";
      qtyValue.value = "1";
      qtyValue.setAttribute("aria-label", "Quantity");
      var inc = mkBtn("+");
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
      row.appendChild(qtyWrap);
    }

    var cta = document.createElement("button");
    cta.className = "searchaly-sticky__cta";
    cta.type = "button";
    cta.textContent = cfg.ctaText || "Add to cart";
    row.appendChild(cta);

    var buyNow = null;
    if (cfg.showBuyNow) {
      buyNow = document.createElement("button");
      buyNow.className = "searchaly-sticky__buynow";
      buyNow.type = "button";
      buyNow.textContent = "Buy now";
      row.appendChild(buyNow);
    }

    document.body.appendChild(bar);
    S.stack(bar);

    // --- Data --------------------------------------------------------------
    function currentVariantId() {
      var checked = form.querySelector('[name="id"]:checked');
      if (checked && checked.value) return checked.value;
      if (idInput && idInput.type !== "radio" && idInput.value) return idInput.value;
      var m = window.location.search.match(/[?&]variant=(\d+)/);
      if (m) return m[1];
      if (product && product.variants && product.variants[0]) return String(product.variants[0].id);
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
        priceEl.textContent = S.money(v.price);
        cta.disabled = v.available === false;
        cta.textContent = v.available === false ? "Sold out" : cfg.ctaText || "Add to cart";
      } else {
        priceEl.textContent = "";
      }
    }

    if (handleMatch) {
      fetch("/products/" + handleMatch[1] + ".js", { headers: { Accept: "application/json" } })
        .then(function (r) {
          return r.ok ? r.json() : null;
        })
        .then(function (p) {
          product = p;
          if (p && p.title) titleEl.textContent = p.title;
          renderVariant();
        })
        .catch(function () {});
    }
    form.addEventListener("change", renderVariant);

    // --- Actions -----------------------------------------------------------
    function showError(msg) {
      errorEl.textContent = msg;
      errorEl.style.display = "";
    }
    function clearError() {
      errorEl.textContent = "";
      errorEl.style.display = "none";
    }

    function addToCart(mode, sourceBtn) {
      if (submitting) return;
      var id = currentVariantId();
      if (!id) return;
      submitting = true;
      clearError();
      var btn = sourceBtn || cta;
      var original = btn.textContent;
      cta.disabled = true;
      if (buyNow) buyNow.disabled = true;
      btn.textContent = "Adding…";
      var reset = function () {
        submitting = false;
        cta.disabled = false;
        if (buyNow) buyNow.disabled = false;
        btn.textContent = original;
      };
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
            var m = res.body && (res.body.description || res.body.message);
            showError(m || "Couldn't add to cart.");
            reset();
            return;
          }
          if (mode === "checkout") {
            window.location.href = "/checkout";
            return;
          }
          // Stay on the page: notify the theme + confirm. (core.js already fired
          // searchaly:cart-updated from the patched fetch, so our bars refresh.)
          try {
            document.dispatchEvent(new CustomEvent("cart:refresh", { bubbles: true }));
          } catch (e) {}
          submitting = false;
          cta.disabled = false;
          if (buyNow) buyNow.disabled = false;
          btn.textContent = "Added ✓";
          setTimeout(function () {
            btn.textContent = original;
          }, 1600);
        })
        .catch(function () {
          showError("Network error. Please try again.");
          reset();
        });
    }

    cta.addEventListener("click", function () {
      addToCart("cart", cta);
    });
    if (buyNow) {
      buyNow.addEventListener("click", function () {
        addToCart("checkout", buyNow);
      });
    }

    // --- Visibility --------------------------------------------------------
    if (!cfg.showAfterScroll) {
      requestAnimationFrame(function () {
        bar.classList.add("is-visible");
      });
    } else {
      var anchor =
        form.querySelector('[type="submit"]') || form.querySelector('[name="add"]') || form;
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

    function mkBtn(label) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = label;
      b.tabIndex = -1;
      return b;
    }
  });
})();
