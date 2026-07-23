import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db.server", () => ({
  default: {
    recentSale: { create: vi.fn(), deleteMany: vi.fn(), findMany: vi.fn() },
  },
}));

import prisma from "../db.server";
import { getRecentSales, recordSale } from "./sales.server";

const db = prisma as unknown as {
  recentSale: {
    create: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
};

describe("recordSale", () => {
  beforeEach(() => vi.clearAllMocks());

  it("stores product + coarse location, no PII", async () => {
    await recordSale("shop.myshopify.com", {
      line_items: [{ title: "The Minimalist Watch" }],
      shipping_address: { city: "Austin", province: "Texas" },
    });
    expect(db.recentSale.create).toHaveBeenCalledTimes(1);
    expect(db.recentSale.create.mock.calls[0][0].data).toMatchObject({
      shop: "shop.myshopify.com",
      product: "The Minimalist Watch",
      city: "Austin",
      region: "Texas",
    });
    // prunes old rows
    expect(db.recentSale.deleteMany).toHaveBeenCalledTimes(1);
  });

  it("falls back to billing address when no shipping address", async () => {
    await recordSale("s", {
      line_items: [{ title: "Mug" }],
      billing_address: { city: "Berlin" },
    });
    expect(db.recentSale.create.mock.calls[0][0].data).toMatchObject({
      product: "Mug",
      city: "Berlin",
      region: null,
    });
  });

  it("skips orders with no line item title", async () => {
    await recordSale("s", { line_items: [] });
    expect(db.recentSale.create).not.toHaveBeenCalled();
  });

  it("skips malformed line items and uses the first titled one", async () => {
    await recordSale("s", {
      line_items: [{ title: "" }, { title: "Real Product" }],
      shipping_address: null,
    });
    expect(db.recentSale.create.mock.calls[0][0].data).toMatchObject({
      product: "Real Product",
      city: null,
    });
  });
});

describe("getRecentSales", () => {
  beforeEach(() => vi.clearAllMocks());

  it("maps rows to DTOs with ISO timestamps", async () => {
    const at = new Date("2026-07-23T10:00:00Z");
    db.recentSale.findMany.mockResolvedValue([
      { product: "Watch", city: "Austin", region: "TX", createdAt: at },
    ]);
    const out = await getRecentSales("s");
    expect(out).toEqual([
      { product: "Watch", city: "Austin", region: "TX", at: at.toISOString() },
    ]);
  });
});
