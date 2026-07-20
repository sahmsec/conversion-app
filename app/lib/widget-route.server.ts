import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { getWidget, upsertWidget } from "../models/widget.server";
import { syncStorefrontConfig } from "../services/metafield-sync.server";
import type { WidgetType } from "./widget-config";

/** Shared loader body for a widget settings route. */
export async function loadWidget(
  { request }: LoaderFunctionArgs,
  type: WidgetType,
) {
  const { session } = await authenticate.admin(request);
  const widget = await getWidget(session.shop, type);
  return { widget };
}

export type WidgetActionData = {
  ok: boolean;
  synced: boolean;
  error: string | null;
};

/**
 * Shared action body for a widget settings route: parse the JSON payload, upsert
 * the widget, then publish to the storefront metafield. A sync failure does NOT
 * fail the save (the merchant can retry).
 */
export async function saveWidget(
  { request }: ActionFunctionArgs,
  type: WidgetType,
): Promise<WidgetActionData> {
  const { admin, session } = await authenticate.admin(request);
  const form = await request.formData();

  let payload: { enabled?: unknown; config?: unknown };
  try {
    payload = JSON.parse(String(form.get("payload") ?? "{}"));
  } catch {
    return { ok: false, synced: false, error: "Invalid form data" };
  }
  // JSON.parse accepts primitives like `null`/`5`; require an object before use.
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, synced: false, error: "Invalid form data" };
  }

  await upsertWidget(session.shop, type, {
    enabled: Boolean(payload.enabled),
    config: payload.config,
  });

  const sync = await syncStorefrontConfig(admin, session.shop);
  return { ok: true, synced: sync.ok, error: sync.ok ? null : sync.error };
}
