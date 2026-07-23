import prisma from "../db.server";

/**
 * Recent-order social proof for the Sales Pop widget. Orders arrive via the
 * orders/create webhook; we store only what the popup shows — product title and a
 * coarse location (city/region). No customer names, emails, or addresses are kept,
 * which keeps the feature privacy-safe while still using 100% real order data.
 */

type OrderAddress = { city?: unknown; province?: unknown } | null | undefined;
type OrderPayload = {
  line_items?: Array<{ title?: unknown }> | null;
  shipping_address?: OrderAddress;
  billing_address?: OrderAddress;
  customer?: { default_address?: OrderAddress } | null;
};

function firstString(...vals: unknown[]): string | null {
  for (const v of vals) {
    if (typeof v === "string" && v.trim().length > 0) return v.trim().slice(0, 100);
  }
  return null;
}

/** Persist a recent sale from an orders/create webhook payload. Never throws for shape. */
export async function recordSale(shop: string, order: OrderPayload): Promise<void> {
  const items = Array.isArray(order?.line_items) ? order!.line_items : [];
  const title = items.find((li) => typeof li?.title === "string" && li.title.trim())?.title;
  if (typeof title !== "string" || !title.trim()) return; // nothing to advertise

  const addr = order?.shipping_address || order?.billing_address || order?.customer?.default_address;
  await prisma.recentSale.create({
    data: {
      shop,
      product: title.trim().slice(0, 200),
      city: firstString(addr?.city),
      region: firstString(addr?.province),
    },
  });

  // Best-effort retention: drop anything older than 30 days for this shop.
  const cutoff = new Date(Date.now() - 30 * 86400000);
  await prisma.recentSale.deleteMany({ where: { shop, createdAt: { lt: cutoff } } });
}

export type RecentSaleDTO = {
  product: string;
  city: string | null;
  region: string | null;
  at: string; // ISO timestamp; the storefront renders a relative "2 hours ago"
};

/** The latest sales for a shop, newest first, for the storefront popup. */
export async function getRecentSales(shop: string, limit = 12): Promise<RecentSaleDTO[]> {
  const rows = await prisma.recentSale.findMany({
    where: { shop },
    orderBy: { createdAt: "desc" },
    take: Math.min(50, Math.max(1, limit)),
  });
  return rows.map((r) => ({
    product: r.product,
    city: r.city,
    region: r.region,
    at: r.createdAt.toISOString(),
  }));
}
