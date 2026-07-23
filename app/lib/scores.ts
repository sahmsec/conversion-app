/**
 * Dashboard scores. Deterministic heuristics derived from which widgets are
 * enabled — no external data needed. These give merchants an at-a-glance sense of
 * how much of the conversion toolkit is active. (A data-driven version lands with
 * analytics in a later phase.)
 */
import { WIDGET_TYPES, type WidgetType } from "./widget-config";

type WidgetStatus = { type: WidgetType; enabled: boolean };

/** How much each widget contributes to the Conversion Score (sums to 100). */
const CONVERSION_WEIGHTS: Record<WidgetType, number> = {
  STICKY_ATC: 25,
  FREE_SHIPPING_BAR: 20,
  TRUST_BADGES: 20,
  ANNOUNCEMENT_BAR: 20,
  CART_GOAL: 15,
};

export function conversionScore(widgets: WidgetStatus[]): number {
  let score = 0;
  for (const w of widgets) if (w.enabled) score += CONVERSION_WEIGHTS[w.type] ?? 0;
  return Math.min(100, score);
}

/** Overall setup health: base for having the app + coverage across widgets. */
export function storeHealthScore(widgets: WidgetStatus[]): number {
  const active = widgets.filter((w) => w.enabled).length;
  return Math.round(40 + (active / WIDGET_TYPES.length) * 60);
}

export type ScoreTone = "success" | "warning" | "critical";

// Bands are aligned with scoreLabel so the colour never contradicts the wording:
//   >= 60 success ("Good"/"Excellent") · 40-59 warning ("Fair") · < 40 critical.
export function scoreTone(score: number): ScoreTone {
  if (score >= 60) return "success";
  if (score >= 40) return "warning";
  return "critical";
}

export function scoreLabel(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  return "Needs work";
}
