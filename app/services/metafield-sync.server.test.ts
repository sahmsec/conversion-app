import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the model layer so no DB is needed; sync just consumes its payload.
vi.mock("../models/widget.server", () => ({
  getStorefrontConfig: vi.fn(async () => ({
    v: 1,
    widgets: { "sticky-cart": { global: {}, ctaText: "Add" } },
  })),
}));

import { syncStorefrontConfig } from "./metafield-sync.server";

type GraphqlResult = { json: () => Promise<unknown> };
const resp = (obj: unknown): GraphqlResult => ({ json: async () => obj });

function makeAdmin(shopResp: unknown, setResp: unknown) {
  return {
    graphql: vi.fn(async (query: string, _options?: unknown) =>
      query.includes("SearchalyShop") ? resp(shopResp) : resp(setResp),
    ),
  };
}

describe("syncStorefrontConfig", () => {
  beforeEach(() => vi.clearAllMocks());

  it("writes the app-owned metafield (with tz) and returns ok on success", async () => {
    const admin = makeAdmin(
      { data: { shop: { id: "gid://shopify/Shop/1", ianaTimezone: "Asia/Tokyo" } } },
      { data: { metafieldsSet: { userErrors: [] } } },
    );
    const r = await syncStorefrontConfig(admin as never, "s.myshopify.com");
    expect(r).toEqual({ ok: true });

    const setVars = (admin.graphql.mock.calls[1][1] as any).variables.metafields[0];
    expect(setVars.namespace).toBe("$app:searchaly");
    expect(setVars.key).toBe("config");
    expect(setVars.type).toBe("json");
    expect(setVars.ownerId).toBe("gid://shopify/Shop/1");
    const value = JSON.parse(setVars.value);
    expect(value.tz).toBe("Asia/Tokyo");
    expect(value.widgets["sticky-cart"]).toBeDefined();
  });

  it("returns ok:false on metafieldsSet userErrors", async () => {
    const admin = makeAdmin(
      { data: { shop: { id: "gid://shopify/Shop/1" } } },
      { data: { metafieldsSet: { userErrors: [{ message: "Value is invalid" }] } } },
    );
    const r = await syncStorefrontConfig(admin as never, "s");
    expect(r.ok).toBe(false);
    expect((r as { error: string }).error).toContain("Value is invalid");
  });

  it("returns ok:false on top-level GraphQL errors (throttle etc.)", async () => {
    const admin = makeAdmin(
      { data: { shop: { id: "gid://shopify/Shop/1" } } },
      { errors: [{ message: "Throttled" }], data: null },
    );
    const r = await syncStorefrontConfig(admin as never, "s");
    expect(r.ok).toBe(false);
    expect((r as { error: string }).error).toContain("Throttled");
  });

  it("returns ok:false when the shop id can't be resolved", async () => {
    const admin = makeAdmin({ data: { shop: {} } }, {});
    const r = await syncStorefrontConfig(admin as never, "s");
    expect(r).toEqual({ ok: false, error: "Could not resolve shop id" });
  });

  it("never throws — a network error becomes ok:false", async () => {
    const admin = {
      graphql: vi.fn(async () => {
        throw new Error("network down");
      }),
    };
    const r = await syncStorefrontConfig(admin as never, "s");
    expect(r.ok).toBe(false);
  });
});
