/**
 * Quantity Breaks discount lifecycle (Admin GraphQL).
 *
 * The volume discount is enforced at checkout by our Shopify **discount function**
 * (extensions/quantity-breaks, target cart.lines.discounts.generate.run). This module
 * registers/updates/removes the automatic app discount that runs that function and
 * feeds it the tier table via a json metafield the function reads
 * (`$app:quantity-breaks / function-configuration`).
 *
 * Never throws — returns a typed result so the settings route can save-and-warn.
 */
import type { QuantityBreakTier } from "../lib/widget-config";

type AdminGraphqlClient = {
  graphql: (
    query: string,
    options?: { variables?: Record<string, unknown> },
  ) => Promise<Response>;
};

const FN_METAFIELD_NAMESPACE = "$app:quantity-breaks";
const FN_METAFIELD_KEY = "function-configuration";
const DISCOUNT_TITLE = "Quantity Breaks — Conversion App";

export type DiscountSyncResult = {
  ok: boolean;
  discountId: string; // "" when no active discount (disabled / deleted / failed-to-create)
  error: string | null;
};

const SHOPIFY_FUNCTIONS = `#graphql
  query SearchalyFunctions {
    shopifyFunctions(first: 50) {
      nodes { id title apiType }
    }
  }`;

const CREATE = `#graphql
  mutation SearchalyDiscountCreate($discount: DiscountAutomaticAppInput!) {
    discountAutomaticAppCreate(automaticAppDiscount: $discount) {
      automaticAppDiscount { discountId }
      userErrors { field message }
    }
  }`;

const METAFIELDS_SET = `#graphql
  mutation SearchalyDiscountConfig($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields { id }
      userErrors { field message code }
    }
  }`;

const DELETE = `#graphql
  mutation SearchalyDiscountDelete($id: ID!) {
    discountAutomaticDelete(id: $id) {
      deletedAutomaticDiscountId
      userErrors { field message }
    }
  }`;

/** Resolve THIS app's discount-function id (gid://shopify/AppFunction/...). */
async function resolveFunctionId(admin: AdminGraphqlClient): Promise<string | null> {
  const resp = await admin.graphql(SHOPIFY_FUNCTIONS);
  const json = (await resp.json()) as {
    data?: { shopifyFunctions?: { nodes?: Array<{ id: string; title?: string; apiType?: string }> } };
  };
  const nodes = json?.data?.shopifyFunctions?.nodes ?? [];
  // Our app owns only its own functions; prefer the discount one.
  const discountFn = nodes.find((n) => n.apiType === "discount") ?? nodes[0];
  return discountFn?.id ?? null;
}

function configValue(tiers: QuantityBreakTier[], variantIds: string[]): string {
  return JSON.stringify({ tiers, variantIds });
}

function topLevelError(json: { errors?: Array<{ message?: string }> }): string | null {
  if (json?.errors && json.errors.length > 0) {
    return json.errors.map((e) => e?.message).filter(Boolean).join("; ") || "GraphQL error";
  }
  return null;
}

/**
 * Reconcile the automatic discount to the desired state.
 *  - enabled + tiers  → create (first time) or refresh its tier metafield.
 *  - disabled / empty → delete any existing discount.
 * Returns the (possibly new/cleared) discountId to persist back on the widget config.
 */
export async function syncQuantityBreaksDiscount(
  admin: AdminGraphqlClient,
  opts: {
    enabled: boolean;
    tiers: QuantityBreakTier[];
    variantIds: string[];
    discountId: string;
  },
): Promise<DiscountSyncResult> {
  const { enabled, tiers, variantIds, discountId } = opts;
  const active = enabled && tiers.length > 0;

  try {
    if (!active) {
      if (discountId) {
        const resp = await admin.graphql(DELETE, { variables: { id: discountId } });
        const json = (await resp.json()) as {
          data?: { discountAutomaticDelete?: { userErrors?: Array<{ message: string }> } };
          errors?: Array<{ message?: string }>;
        };
        const top = topLevelError(json);
        const ue = json?.data?.discountAutomaticDelete?.userErrors ?? [];
        // If it's already gone, treat as success.
        if (top || ue.length > 0) {
          return { ok: false, discountId: "", error: top || ue.map((e) => e.message).join("; ") };
        }
      }
      return { ok: true, discountId: "", error: null };
    }

    const value = configValue(tiers, variantIds);

    // Existing discount → just refresh its tier metafield.
    if (discountId) {
      const resp = await admin.graphql(METAFIELDS_SET, {
        variables: {
          metafields: [
            {
              ownerId: discountId,
              namespace: FN_METAFIELD_NAMESPACE,
              key: FN_METAFIELD_KEY,
              type: "json",
              value,
            },
          ],
        },
      });
      const json = (await resp.json()) as {
        data?: { metafieldsSet?: { userErrors?: Array<{ message: string }> } };
        errors?: Array<{ message?: string }>;
      };
      const top = topLevelError(json);
      const ue = json?.data?.metafieldsSet?.userErrors ?? [];
      if (top || ue.length > 0) {
        return { ok: false, discountId, error: top || ue.map((e) => e.message).join("; ") };
      }
      return { ok: true, discountId, error: null };
    }

    // First activation → create the automatic discount with the tier metafield inline.
    const functionId = await resolveFunctionId(admin);
    if (!functionId) {
      return {
        ok: false,
        discountId: "",
        error: "Discount function not found. Deploy the app, then try again.",
      };
    }

    const resp = await admin.graphql(CREATE, {
      variables: {
        discount: {
          title: DISCOUNT_TITLE,
          functionId,
          discountClasses: ["PRODUCT"],
          startsAt: new Date().toISOString(),
          combinesWith: {
            orderDiscounts: true,
            productDiscounts: true,
            shippingDiscounts: true,
          },
          metafields: [
            {
              namespace: FN_METAFIELD_NAMESPACE,
              key: FN_METAFIELD_KEY,
              type: "json",
              value,
            },
          ],
        },
      },
    });
    const json = (await resp.json()) as {
      data?: {
        discountAutomaticAppCreate?: {
          automaticAppDiscount?: { discountId?: string };
          userErrors?: Array<{ message: string }>;
        };
      };
      errors?: Array<{ message?: string }>;
    };
    const top = topLevelError(json);
    const ue = json?.data?.discountAutomaticAppCreate?.userErrors ?? [];
    const newId = json?.data?.discountAutomaticAppCreate?.automaticAppDiscount?.discountId;
    if (top || ue.length > 0 || !newId) {
      return {
        ok: false,
        discountId: "",
        error: top || ue.map((e) => e.message).join("; ") || "Could not create the discount.",
      };
    }
    return { ok: true, discountId: newId, error: null };
  } catch (error) {
    return {
      ok: false,
      discountId,
      error: error instanceof Error ? error.message : "Unknown discount error",
    };
  }
}
