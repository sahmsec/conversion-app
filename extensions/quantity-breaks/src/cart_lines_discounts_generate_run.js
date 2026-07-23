import {
  DiscountClass,
  ProductDiscountSelectionStrategy,
} from '../generated/api';

/**
 * @typedef {import("../generated/api").CartInput} RunInput
 * @typedef {import("../generated/api").CartLinesDiscountsGenerateRunResult} CartLinesDiscountsGenerateRunResult
 */

const EMPTY = {operations: []};

/**
 * Quantity Breaks (volume discount): apply a % off a cart line once its quantity
 * reaches a configured tier. Tiers are read from the discount's own metafield
 * (written by the app when the merchant saves), so no code change is needed to
 * retune them. Optionally scoped to specific product variants.
 *
 * Config shape (metafield jsonValue):
 *   { "tiers": [ { "minQuantity": 2, "percent": 10 }, { "minQuantity": 4, "percent": 15 } ],
 *     "variantIds": ["gid://shopify/ProductVariant/123"] }   // variantIds optional
 *
 * @param {RunInput} input
 * @returns {CartLinesDiscountsGenerateRunResult}
 */
export function cartLinesDiscountsGenerateRun(input) {
  if (!input.cart.lines.length) return EMPTY;

  // Only emit product-class operations when this discount was granted PRODUCT.
  if (!input.discount.discountClasses.includes(DiscountClass.Product)) return EMPTY;

  const config = input.discount.metafield && input.discount.metafield.jsonValue;
  const rawTiers = config && Array.isArray(config.tiers) ? config.tiers : [];
  const tiers = rawTiers
    .filter((t) => t && Number(t.minQuantity) > 0 && Number(t.percent) > 0)
    .sort((a, b) => Number(b.minQuantity) - Number(a.minQuantity)); // highest tier first
  if (!tiers.length) return EMPTY;

  const variantIds =
    config && Array.isArray(config.variantIds) && config.variantIds.length > 0
      ? config.variantIds
      : null;

  const candidates = [];
  for (const line of input.cart.lines) {
    if (variantIds) {
      const m = line.merchandise;
      if (!m || m.__typename !== 'ProductVariant' || !variantIds.includes(m.id)) {
        continue;
      }
    }
    const qty = Number(line.quantity) || 0;
    const tier = tiers.find((t) => qty >= Number(t.minQuantity));
    if (!tier) continue;

    candidates.push({
      message: `Buy ${tier.minQuantity}+ save ${tier.percent}%`,
      targets: [{cartLine: {id: line.id}}],
      value: {percentage: {value: Number(tier.percent)}},
    });
  }

  if (!candidates.length) return EMPTY;

  return {
    operations: [
      {
        productDiscountsAdd: {
          candidates,
          // ALL = discount every qualifying line on its own merits.
          selectionStrategy: ProductDiscountSelectionStrategy.All,
        },
      },
    ],
  };
}
