import { describe, expect, it } from "vitest";
import {
  conversionScore,
  scoreLabel,
  scoreTone,
  storeHealthScore,
} from "./scores";
import { WIDGET_TYPES, type WidgetType } from "./widget-config";

const all = (enabled: boolean) =>
  WIDGET_TYPES.map((type) => ({ type: type as WidgetType, enabled }));

describe("conversionScore", () => {
  it("is 0 with nothing enabled and 100 with everything enabled", () => {
    expect(conversionScore(all(false))).toBe(0);
    expect(conversionScore(all(true))).toBe(100);
  });

  it("sums per-widget weights", () => {
    expect(
      conversionScore([
        { type: "STICKY_ATC", enabled: true }, // 25
        { type: "CART_GOAL", enabled: true }, // 15
        { type: "FREE_SHIPPING_BAR", enabled: false },
        { type: "TRUST_BADGES", enabled: false },
        { type: "ANNOUNCEMENT_BAR", enabled: false },
      ]),
    ).toBe(40);
  });
});

describe("storeHealthScore", () => {
  it("has a base of 40 with nothing on and 100 with all on", () => {
    expect(storeHealthScore(all(false))).toBe(40);
    expect(storeHealthScore(all(true))).toBe(100);
  });
});

describe("scoreTone / scoreLabel", () => {
  it("maps ranges to tones", () => {
    expect(scoreTone(80)).toBe("success");
    expect(scoreTone(50)).toBe("warning");
    expect(scoreTone(20)).toBe("critical");
  });
  it("labels ranges", () => {
    expect(scoreLabel(90)).toBe("Excellent");
    expect(scoreLabel(65)).toBe("Good");
    expect(scoreLabel(45)).toBe("Fair");
    expect(scoreLabel(10)).toBe("Needs work");
  });
});
