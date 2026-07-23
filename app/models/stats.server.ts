import prisma from "../db.server";

const VALID_EVENTS = new Set(["impression", "click", "goal"]);

function utcDay(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Increment aggregated daily counters for a batch of storefront events. */
export async function recordEvents(
  shop: string,
  events: Array<{ widget?: unknown; event?: unknown }>,
): Promise<void> {
  if (!Array.isArray(events)) return;
  const day = utcDay();
  const counts = new Map<string, number>();
  for (const e of events) {
    if (!e || typeof e.widget !== "string" || typeof e.event !== "string") continue;
    if (!VALID_EVENTS.has(e.event) || e.widget.length > 40) continue;
    const key = e.widget + "|" + e.event;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  for (const [key, count] of counts) {
    const [widget, event] = key.split("|");
    await prisma.widgetStat.upsert({
      where: { shop_widget_event_day: { shop, widget, event, day } },
      create: { shop, widget, event, day, count },
      update: { count: { increment: count } },
    });
  }
}

export type WidgetStats = Record<
  string,
  { impression: number; click: number; goal: number }
>;

/** Aggregate stats per widget for the last `days` days. */
export async function getStats(shop: string, days = 30): Promise<WidgetStats> {
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const rows = await prisma.widgetStat.findMany({
    where: { shop, day: { gte: since } },
  });
  const agg: WidgetStats = {};
  for (const r of rows) {
    if (!agg[r.widget]) agg[r.widget] = { impression: 0, click: 0, goal: 0 };
    if (r.event === "impression" || r.event === "click" || r.event === "goal") {
      agg[r.widget][r.event] += r.count;
    }
  }
  return agg;
}
