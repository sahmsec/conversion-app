import { describe, expect, it } from "vitest";
import {
  DEFAULT_GLOBAL,
  buildStorefrontConfig,
  defaultConfig,
  normalizeConfig,
  normalizeGlobal,
} from "./widget-config";

describe("normalizeGlobal", () => {
  it("returns full defaults for empty/garbage input", () => {
    expect(normalizeGlobal(undefined)).toEqual(DEFAULT_GLOBAL);
    expect(normalizeGlobal(null)).toEqual(DEFAULT_GLOBAL);
    expect(normalizeGlobal("nonsense")).toEqual(DEFAULT_GLOBAL);
    expect(normalizeGlobal(42)).toEqual(DEFAULT_GLOBAL);
  });

  it("rejects invalid hex colours and falls back to defaults", () => {
    const g = normalizeGlobal({ colors: { bg: "red", text: "#fff", accent: "#12345g" } });
    expect(g.colors.bg).toBe(DEFAULT_GLOBAL.colors.bg); // "red" is not hex
    expect(g.colors.text).toBe("#fff"); // valid short hex
    expect(g.colors.accent).toBe(DEFAULT_GLOBAL.colors.accent); // invalid char
  });

  it("clamps numeric ranges", () => {
    const g = normalizeGlobal({
      typography: { fontSize: 999, fontWeight: 50 },
      animation: { type: "slide", speedMs: -100 },
    });
    expect(g.typography.fontSize).toBe(32); // clamped to max
    expect(g.typography.fontWeight).toBe(300); // clamped to min
    expect(g.animation.speedMs).toBe(0); // clamped to min
    expect(g.animation.type).toBe("slide");
  });

  it("rejects unknown enum values", () => {
    const g = normalizeGlobal({ position: "left", animation: { type: "explode" } });
    expect(g.position).toBe(DEFAULT_GLOBAL.position);
    expect(g.animation.type).toBe(DEFAULT_GLOBAL.animation.type);
  });

  it("normalizes a schedule and filters invalid days", () => {
    const g = normalizeGlobal({
      schedule: { start: "2026-01-01", days: [0, 3, 9, -1, 6] },
    });
    expect(g.schedule).not.toBeNull();
    expect(g.schedule!.start).toBe("2026-01-01");
    expect(g.schedule!.days).toEqual([0, 3, 6]);
  });

  it("keeps schedule null when absent", () => {
    expect(normalizeGlobal({}).schedule).toBeNull();
  });
});

describe("normalizeConfig (STICKY_ATC)", () => {
  it("fills sticky defaults from empty input", () => {
    const c = normalizeConfig("STICKY_ATC", {});
    expect(c.widget).toEqual({
      ctaText: "Add to cart",
      showQuantity: true,
      showBuyNow: true,
      showAfterScroll: true,
    });
  });

  it("preserves provided sticky values and coerces types", () => {
    const c = normalizeConfig("STICKY_ATC", {
      widget: { ctaText: "Buy it", showBuyNow: false, showQuantity: "yes" },
    });
    expect(c.widget.ctaText).toBe("Buy it");
    expect(c.widget.showBuyNow).toBe(false);
    expect(c.widget.showQuantity).toBe(true); // non-bool -> default true
  });
});

describe("defaultConfig", () => {
  it("produces an independent copy each call", () => {
    const a = defaultConfig("STICKY_ATC");
    const b = defaultConfig("STICKY_ATC");
    expect(a).not.toBe(b);
    expect(a.global).not.toBe(b.global);
  });
});

describe("buildStorefrontConfig", () => {
  it("includes only enabled widgets, keyed by storefront key", () => {
    const payload = buildStorefrontConfig([
      { type: "STICKY_ATC", enabled: true, config: { widget: { ctaText: "Go" } } },
      { type: "ANNOUNCEMENT_BAR", enabled: false, config: {} },
    ]);
    expect(payload.v).toBe(1);
    expect(Object.keys(payload.widgets)).toEqual(["sticky-cart"]);
    expect(payload.widgets["sticky-cart"].ctaText).toBe("Go");
    expect(payload.widgets["sticky-cart"].global).toBeDefined();
  });

  it("returns an empty widget map when nothing is enabled", () => {
    const payload = buildStorefrontConfig([
      { type: "STICKY_ATC", enabled: false, config: {} },
    ]);
    expect(payload.widgets).toEqual({});
  });
});
