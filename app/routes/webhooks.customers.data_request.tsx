import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

/**
 * GDPR: customers/data_request. Conversion App stores NO customer personal data
 * (only shop-level widget configuration + OAuth sessions), so there is nothing to
 * return. We acknowledge the request per Shopify's mandatory-webhook contract.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);
  console.log(`Received ${topic} for ${shop} — no customer data stored; acknowledged.`);
  return new Response();
};
