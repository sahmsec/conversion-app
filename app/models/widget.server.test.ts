import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db.server", () => ({
  default: {
    widgetSettings: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

import prisma from "../db.server";
import { listWidgets, setWidgetEnabled, upsertWidget } from "./widget.server";
import { WIDGET_TYPES } from "../lib/widget-config";

const db = prisma as unknown as {
  widgetSettings: {
    findMany: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
  };
};

describe("listWidgets", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns every widget type in canonical order, filling missing with disabled defaults", async () => {
    db.widgetSettings.findMany.mockResolvedValue([
      { type: "CART_GOAL", enabled: true, config: { global: {}, widget: {} } },
    ]);
    const rows = await listWidgets("shop");
    expect(rows.map((r) => r.type)).toEqual([...WIDGET_TYPES]);
    expect(rows.find((r) => r.type === "CART_GOAL")!.enabled).toBe(true);
    expect(rows.find((r) => r.type === "STICKY_ATC")!.enabled).toBe(false);
  });
});

describe("upsertWidget", () => {
  beforeEach(() => vi.clearAllMocks());

  it("normalizes config before persisting and in the returned row", async () => {
    db.widgetSettings.upsert.mockImplementation(async (args: any) => ({
      type: "STICKY_ATC",
      enabled: args.update.enabled,
      config: args.update.config,
    }));
    const row = await upsertWidget("shop", "STICKY_ATC", {
      enabled: true,
      config: { widget: { ctaText: 123, showBuyNow: "nope" } },
    });
    expect((row.config.widget as { ctaText: string }).ctaText).toBe("Add to cart");
    expect((row.config.widget as { showBuyNow: boolean }).showBuyNow).toBe(true);
    // What was actually written to the DB is already normalized.
    const written = db.widgetSettings.upsert.mock.calls[0][0].update.config;
    expect(written.widget.ctaText).toBe("Add to cart");
  });
});

describe("setWidgetEnabled", () => {
  beforeEach(() => vi.clearAllMocks());

  it("patches ONLY enabled (never config) and seeds defaults on create", async () => {
    db.widgetSettings.upsert.mockImplementation(async (args: any) => ({
      type: "TRUST_BADGES",
      enabled: args.update.enabled,
      config: args.create.config,
    }));
    const row = await setWidgetEnabled("shop", "TRUST_BADGES", true);
    expect(row.enabled).toBe(true);
    const call = db.widgetSettings.upsert.mock.calls[0][0];
    expect(call.update).toEqual({ enabled: true });
    expect(call.create.config).toBeDefined();
  });
});
