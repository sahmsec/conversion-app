import {describe, expect, it} from 'vitest';
import {cartLinesDiscountsGenerateRun} from '../src/cart_lines_discounts_generate_run';

const VARIANT = 'gid://shopify/ProductVariant/1';

function line(id, quantity, variantId = VARIANT) {
  return {
    id,
    quantity,
    cost: {subtotalAmount: {amount: '10.0'}},
    merchandise: {__typename: 'ProductVariant', id: variantId},
  };
}

function input({classes = ['PRODUCT'], config, lines}) {
  return {
    cart: {lines},
    discount: {
      discountClasses: classes,
      metafield: config === undefined ? null : {jsonValue: config},
    },
  };
}

const TIERS = {
  tiers: [
    {minQuantity: 2, percent: 10},
    {minQuantity: 4, percent: 15},
  ],
};

describe('cartLinesDiscountsGenerateRun', () => {
  it('returns nothing without a config metafield', () => {
    const r = cartLinesDiscountsGenerateRun(input({config: undefined, lines: [line('1', 5)]}));
    expect(r.operations).toEqual([]);
  });

  it('returns nothing without the PRODUCT class', () => {
    const r = cartLinesDiscountsGenerateRun(
      input({classes: ['ORDER'], config: TIERS, lines: [line('1', 5)]}),
    );
    expect(r.operations).toEqual([]);
  });

  it('applies the highest qualifying tier to a line', () => {
    const r = cartLinesDiscountsGenerateRun(input({config: TIERS, lines: [line('1', 5)]}));
    const op = r.operations[0].productDiscountsAdd;
    expect(op.selectionStrategy).toBe('ALL');
    expect(op.candidates).toHaveLength(1);
    expect(op.candidates[0].value.percentage.value).toBe(15); // qty 5 -> 4+ tier
    expect(op.candidates[0].targets[0].cartLine.id).toBe('1');
  });

  it('skips lines below the lowest tier', () => {
    const r = cartLinesDiscountsGenerateRun(input({config: TIERS, lines: [line('1', 1)]}));
    expect(r.operations).toEqual([]);
  });

  it('honors variant scoping', () => {
    const config = {...TIERS, variantIds: [VARIANT]};
    const r = cartLinesDiscountsGenerateRun(
      input({
        config,
        lines: [line('1', 5, VARIANT), line('2', 5, 'gid://shopify/ProductVariant/999')],
      }),
    );
    const op = r.operations[0].productDiscountsAdd;
    expect(op.candidates).toHaveLength(1);
    expect(op.candidates[0].targets[0].cartLine.id).toBe('1');
  });
});
