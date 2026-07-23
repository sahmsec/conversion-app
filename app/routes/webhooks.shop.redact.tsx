import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

/**
 * GDPR: shop/redact (sent ~48h after uninstall). Erase everything we hold for the
 * shop — its widget configuration and any residual OAuth sessions.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);
  console.log(`Received ${topic} for ${shop} — purging shop data.`);
  await db.widgetSettings.deleteMany({ where: { shop } });
  await db.session.deleteMany({ where: { shop } });
  return new Response();
};
