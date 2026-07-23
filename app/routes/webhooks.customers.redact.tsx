import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

/**
 * GDPR: customers/redact. Conversion App stores NO customer personal data, so
 * there is nothing to erase. Acknowledged per Shopify's mandatory-webhook contract.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);
  console.log(`Received ${topic} for ${shop} — no customer data stored; acknowledged.`);
  return new Response();
};
