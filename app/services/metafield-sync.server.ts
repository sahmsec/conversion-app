import { getStorefrontConfig } from "../models/widget.server";

/**
 * Publishes a shop's enabled-widget config to a single app-owned shop metafield,
 * which the theme app extension reads in Liquid with zero backend calls.
 *
 * Namespace uses the reserved `$app:` prefix, so it resolves to the fully-qualified
 * `app--{app-id}--searchaly` without hardcoding the app id, and is app-owned
 * (merchant cannot edit it, and writes are authorized by app ownership — no extra
 * OAuth scope required). Read side (theme extension Liquid):
 *
 *   {{ shop.metafields["$app:searchaly"].config.value | json }}
 */
export const METAFIELD_NAMESPACE = "$app:searchaly";
export const METAFIELD_KEY = "config";

/** Minimal structural type for the admin GraphQL client from `authenticate.admin`. */
type AdminGraphqlClient = {
  graphql: (
    query: string,
    options?: { variables?: Record<string, unknown> },
  ) => Promise<Response>;
};

export type SyncResult = { ok: true } | { ok: false; error: string };

const SHOP_ID_QUERY = `#graphql
  query SearchalyShopId {
    shop { id }
  }`;

const METAFIELDS_SET = `#graphql
  mutation SearchalySetConfig($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields { id key namespace }
      userErrors { field message code }
    }
  }`;

/**
 * Build the storefront payload for `shop` and write it to the app-owned metafield.
 * Never throws — returns a typed result so the caller can save-succeed-but-warn.
 */
export async function syncStorefrontConfig(
  admin: AdminGraphqlClient,
  shop: string,
): Promise<SyncResult> {
  try {
    const payload = await getStorefrontConfig(shop);

    // Resolve the shop GID required as the metafield owner.
    const shopResp = await admin.graphql(SHOP_ID_QUERY);
    const shopJson = (await shopResp.json()) as {
      data?: { shop?: { id?: string } };
    };
    const ownerId = shopJson?.data?.shop?.id;
    if (!ownerId) {
      return { ok: false, error: "Could not resolve shop id" };
    }

    const resp = await admin.graphql(METAFIELDS_SET, {
      variables: {
        metafields: [
          {
            ownerId,
            namespace: METAFIELD_NAMESPACE,
            key: METAFIELD_KEY,
            type: "json",
            value: JSON.stringify(payload),
          },
        ],
      },
    });

    const json = (await resp.json()) as {
      data?: {
        metafieldsSet?: {
          userErrors?: Array<{ field?: string[]; message: string; code?: string }>;
        };
      };
    };
    const errors = json?.data?.metafieldsSet?.userErrors ?? [];
    if (errors.length > 0) {
      return { ok: false, error: errors.map((e) => e.message).join("; ") };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown sync error",
    };
  }
}
