import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { recordEvents } from "../models/stats.server";

/**
 * App Proxy endpoint for storefront analytics events. Reached from the storefront
 * at /apps/searchaly/events; Shopify signs the request and `authenticate.public
 * .appProxy` verifies the signature. Accepts a JSON array of {widget, event}.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.public.appProxy(request);
  const shop = session?.shop || new URL(request.url).searchParams.get("shop");
  if (!shop) return new Response(null, { status: 401 });

  let events: unknown;
  try {
    events = JSON.parse(await request.text());
  } catch {
    return new Response(null, { status: 204 });
  }
  if (Array.isArray(events)) {
    await recordEvents(shop, events as Array<{ widget?: unknown; event?: unknown }>);
  }
  return new Response(null, { status: 204 });
};
