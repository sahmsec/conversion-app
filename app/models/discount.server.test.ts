import { describe, expect, it, vi } from "vitest";
import { syncQuantityBreaksDiscount } from "./discount.server";

/** Build a mock admin whose graphql() responds based on the query it receives. */
function mockAdmin(responses: {
  functions?: unknown;
  create?: unknown;
  metafields?: unknown;
  del?: unknown;
  existing?: unknown;
}) {
  const graphql = vi.fn(async (query: string) => {
    let data: unknown = {};
    if (query.includes("discountAutomaticDelete")) data = responses.del;
    else if (query.includes("discountNodes")) data = responses.existing ?? { data: { discountNodes: { nodes: [] } } };
    else if (query.includes("shopifyFunctions")) data = responses.functions;
    else if (query.includes("discountAutomaticAppCreate")) data = responses.create;
    else if (query.includes("metafieldsSet")) data = responses.metafields;
    return { json: async () => data } as unknown as Response;
  });
  return { admin: { graphql }, graphql };
}

const TIERS = [{ minQuantity: 2, percent: 10 }];

describe("syncQuantityBreaksDiscount", () => {
  it("creates a discount on first activation and returns the new id", async () => {
    const { admin, graphql } = mockAdmin({
      functions: { data: { shopifyFunctions: { nodes: [{ id: "gid://shopify/AppFunction/1", apiType: "discount" }] } } },
      create: {
        data: {
          discountAutomaticAppCreate: {
            automaticAppDiscount: { discountId: "gid://shopify/DiscountAutomaticNode/9" },
            userErrors: [],
          },
        },
      },
    });
    const r = await syncQuantityBreaksDiscount(admin, {
      enabled: true,
      tiers: TIERS,
      variantIds: [],
      discountId: "",
    });
    expect(r.ok).toBe(true);
    expect(r.discountId).toBe("gid://shopify/DiscountAutomaticNode/9");
    // checked for an existing discount, resolved the function, then created
    expect(graphql).toHaveBeenCalledTimes(3);
  });

  it("reuses an existing discount instead of creating a duplicate (idempotent)", async () => {
    const { admin, graphql } = mockAdmin({
      existing: {
        data: {
          discountNodes: {
            nodes: [
              { id: "gid://shopify/DiscountAutomaticNode/42", discount: { title: "Quantity Breaks — Conversion App" } },
            ],
          },
        },
      },
      metafields: { data: { metafieldsSet: { userErrors: [] } } },
    });
    const r = await syncQuantityBreaksDiscount(admin, {
      enabled: true,
      tiers: TIERS,
      variantIds: [],
      discountId: "", // lost handle
    });
    expect(r.ok).toBe(true);
    expect(r.discountId).toBe("gid://shopify/DiscountAutomaticNode/42");
    // found existing + refreshed its metafield — NO create
    expect(graphql).toHaveBeenCalledTimes(2);
    expect(graphql.mock.calls.some((c) => c[0].includes("discountAutomaticAppCreate"))).toBe(false);
  });

  it("preserves the discount id when a non-'not found' delete fails", async () => {
    const { admin } = mockAdmin({
      del: {
        data: { discountAutomaticDelete: { deletedAutomaticDiscountId: null, userErrors: [] } },
        errors: [{ message: "Throttled" }],
      },
    });
    const r = await syncQuantityBreaksDiscount(admin, {
      enabled: false,
      tiers: TIERS,
      variantIds: [],
      discountId: "gid://shopify/DiscountAutomaticNode/9",
    });
    expect(r.ok).toBe(false);
    expect(r.discountId).toBe("gid://shopify/DiscountAutomaticNode/9"); // handle preserved
  });

  it("clears the id when the discount is already gone (not found)", async () => {
    const { admin } = mockAdmin({
      del: {
        data: {
          discountAutomaticDelete: {
            deletedAutomaticDiscountId: null,
            userErrors: [{ message: "Discount not found" }],
          },
        },
      },
    });
    const r = await syncQuantityBreaksDiscount(admin, {
      enabled: false,
      tiers: TIERS,
      variantIds: [],
      discountId: "gid://shopify/DiscountAutomaticNode/9",
    });
    expect(r.ok).toBe(true);
    expect(r.discountId).toBe("");
  });

  it("updates the tier metafield when a discount already exists", async () => {
    const { admin, graphql } = mockAdmin({
      metafields: { data: { metafieldsSet: { userErrors: [] } } },
    });
    const r = await syncQuantityBreaksDiscount(admin, {
      enabled: true,
      tiers: TIERS,
      variantIds: [],
      discountId: "gid://shopify/DiscountAutomaticNode/9",
    });
    expect(r.ok).toBe(true);
    expect(r.discountId).toBe("gid://shopify/DiscountAutomaticNode/9");
    // only the metafieldsSet call — no re-create
    expect(graphql).toHaveBeenCalledTimes(1);
    expect(graphql.mock.calls[0][0]).toContain("metafieldsSet");
  });

  it("deletes the discount when disabled and clears the id", async () => {
    const { admin, graphql } = mockAdmin({
      del: { data: { discountAutomaticDelete: { deletedAutomaticDiscountId: "x", userErrors: [] } } },
    });
    const r = await syncQuantityBreaksDiscount(admin, {
      enabled: false,
      tiers: TIERS,
      variantIds: [],
      discountId: "gid://shopify/DiscountAutomaticNode/9",
    });
    expect(r.ok).toBe(true);
    expect(r.discountId).toBe("");
    expect(graphql.mock.calls[0][0]).toContain("discountAutomaticDelete");
  });

  it("no-ops (no id) when disabled with no existing discount", async () => {
    const { admin, graphql } = mockAdmin({});
    const r = await syncQuantityBreaksDiscount(admin, {
      enabled: false,
      tiers: [],
      variantIds: [],
      discountId: "",
    });
    expect(r.ok).toBe(true);
    expect(r.discountId).toBe("");
    expect(graphql).not.toHaveBeenCalled();
  });

  it("surfaces a userError from create as a failure", async () => {
    const { admin } = mockAdmin({
      functions: { data: { shopifyFunctions: { nodes: [{ id: "gid://shopify/AppFunction/1", apiType: "discount" }] } } },
      create: {
        data: {
          discountAutomaticAppCreate: {
            automaticAppDiscount: null,
            userErrors: [{ message: "Function not found" }],
          },
        },
      },
    });
    const r = await syncQuantityBreaksDiscount(admin, {
      enabled: true,
      tiers: TIERS,
      variantIds: [],
      discountId: "",
    });
    expect(r.ok).toBe(false);
    expect(r.error).toContain("Function not found");
  });
});
