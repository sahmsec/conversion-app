import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { recordSale } from "../models/sales.server";

/**
 * orders/create — feeds the Sales Pop widget's rolling recent-orders list. We store
 * only the product title + coarse location (see recordSale); no PII is retained.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);

  try {
    await recordSale(shop, (payload ?? {}) as Parameters<typeof recordSale>[1]);
  } catch (e) {
    // Webhooks must return 2xx or Shopify retries; log and swallow storage errors.
    console.error("[sales-pop] failed to record sale", e);
  }

  return new Response();
};
