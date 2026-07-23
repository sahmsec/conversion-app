import type { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { getRecentSales } from "../models/sales.server";

/**
 * App Proxy endpoint for the Sales Pop widget. Reached from the storefront at
 * /apps/searchaly/recent-sales; Shopify signs the request and appProxy verifies it.
 * Returns the shop's latest sales as JSON (no PII — product + coarse location only).
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.public.appProxy(request);
  const shop = session?.shop || new URL(request.url).searchParams.get("shop");
  if (!shop) return new Response("[]", { status: 401, headers: JSON_HEADERS });

  const sales = await getRecentSales(shop);
  return new Response(JSON.stringify(sales), { status: 200, headers: JSON_HEADERS });
};

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  // Short cache: the storefront doesn't need real-time freshness for social proof.
  "Cache-Control": "public, max-age=60",
};
