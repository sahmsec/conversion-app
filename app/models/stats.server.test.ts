import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db.server", () => ({
  default: { widgetStat: { findMany: vi.fn(), upsert: vi.fn() } },
}));

import prisma from "../db.server";
import { getStats, recordEvents } from "./stats.server";

const db = prisma as unknown as {
  widgetStat: { findMany: ReturnType<typeof vi.fn>; upsert: ReturnType<typeof vi.fn> };
};

describe("getStats", () => {
  beforeEach(() => vi.clearAllMocks());
  it("aggregates rows by widget + event", async () => {
    db.widgetStat.findMany.mockResolvedValue([
      { widget: "sticky-cart", event: "impression", count: 5 },
      { widget: "sticky-cart", event: "click", count: 2 },
      { widget: "sticky-cart", event: "impression", count: 3 },
      { widget: "free-shipping-bar", event: "goal", count: 1 },
    ]);
    const s = await getStats("shop");
    expect(s["sticky-cart"]).toEqual({ impression: 8, click: 2, goal: 0 });
    expect(s["free-shipping-bar"]).toEqual({ impression: 0, click: 0, goal: 1 });
  });
});

describe("recordEvents", () => {
  beforeEach(() => vi.clearAllMocks());
  it("batches counts per widget/event and ignores invalid ones", async () => {
    await recordEvents("shop", [
      { widget: "sticky-cart", event: "impression" },
      { widget: "sticky-cart", event: "impression" },
      { widget: "sticky-cart", event: "click" },
      { widget: "x", event: "bogus" }, // invalid event
      { widget: 5, event: "impression" }, // invalid widget
    ] as never);
    expect(db.widgetStat.upsert).toHaveBeenCalledTimes(2);
    const calls = db.widgetStat.upsert.mock.calls.map((c) => c[0]);
    const imp = calls.find(
      (c: any) => c.where.shop_widget_event_day.event === "impression",
    );
    expect(imp.create.count).toBe(2);
    expect(imp.update.count).toEqual({ increment: 2 });
  });
});
