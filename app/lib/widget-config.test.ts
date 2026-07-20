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

  it("keys enabled widgets by their storefront key", () => {
    const payload = buildStorefrontConfig([
      { type: "FREE_SHIPPING_BAR", enabled: true, config: {} },
      { type: "ANNOUNCEMENT_BAR", enabled: true, config: {} },
    ]);
    expect(Object.keys(payload.widgets).sort()).toEqual([
      "announcement-bar",
      "free-shipping-bar",
    ]);
  });
});

describe("normalizeConfig — Free Shipping Bar & Cart Goal", () => {
  it("clamps a negative goal to 0 and preserves tokens", () => {
    const c = normalizeConfig("FREE_SHIPPING_BAR", {
      widget: { goalCents: -50, messageBefore: "Add {{remaining}}!" },
    });
    expect(c.widget.goalCents).toBe(0);
    expect(c.widget.messageBefore).toBe("Add {{remaining}}!");
    expect(c.widget.showProgressBar).toBe(true);
  });

  it("Cart Goal fills reward + message defaults", () => {
    const c = normalizeConfig("CART_GOAL", {});
    expect(c.widget.reward).toBe("a free gift");
    expect(typeof c.widget.messageBefore).toBe("string");
  });
});

describe("normalizeConfig — Trust Badges", () => {
  it("drops unknown badge keys and invalid alignment", () => {
    const c = normalizeConfig("TRUST_BADGES", {
      widget: { badges: ["visa", "bogus", "ssl"], alignment: "diagonal" },
    });
    expect(c.widget.badges).toEqual(["visa", "ssl"]);
    expect(c.widget.alignment).toBe("center");
  });

  it("falls back to default badges when none are valid", () => {
    const c = normalizeConfig("TRUST_BADGES", { widget: { badges: ["nope"] } });
    expect((c.widget.badges as string[]).length).toBeGreaterThan(0);
  });
});

describe("normalizeConfig — Announcement Bar", () => {
  it("filters empty messages, clamps rotation, nulls empty countdown", () => {
    const c = normalizeConfig("ANNOUNCEMENT_BAR", {
      widget: { messages: ["A", "", "   ", "B"], rotateMs: 10, countdownTo: "" },
    });
    expect(c.widget.messages).toEqual(["A", "B"]);
    expect(c.widget.rotateMs).toBe(1000);
    expect(c.widget.countdownTo).toBeNull();
  });

  it("falls back to a default message when list is empty", () => {
    const c = normalizeConfig("ANNOUNCEMENT_BAR", { widget: { messages: [] } });
    expect((c.widget.messages as string[]).length).toBe(1);
  });
});
