import { describe, expect, it, vi } from "vitest";
import { syncQuantityBreaksDiscount } from "./discount.server";

/** Build a mock admin whose graphql() responds based on the query it receives. */
function mockAdmin(responses: {
  functions?: unknown;
  create?: unknown;
  metafields?: unknown;
  del?: unknown;
}) {
  const graphql = vi.fn(async (query: string) => {
    let data: unknown = {};
    if (query.includes("shopifyFunctions")) data = responses.functions;
    else if (query.includes("discountAutomaticAppCreate")) data = responses.create;
    else if (query.includes("metafieldsSet")) data = responses.metafields;
    else if (query.includes("discountAutomaticDelete")) data = responses.del;
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
    // resolved function + created
    expect(graphql).toHaveBeenCalledTimes(2);
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
