import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import {
  getWidget,
  setWidgetEnabled,
  upsertWidget,
  type WidgetRow,
} from "../models/widget.server";
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
  /** The persisted, normalized state — lets the client sync its form + baseline
   *  to what was actually stored (so the UI never claims a value it didn't save). */
  widget: WidgetRow | null;
};

/**
 * Shared action for a widget settings route.
 *  - intent "toggle": patch ONLY the enabled flag (never clobbers config/drafts).
 *  - intent "save":  full upsert of enabled + config.
 * DB errors are caught and surfaced (so a transient Postgres blip shows a banner
 * instead of crashing the embedded admin). Storefront sync stays best-effort.
 */
export async function saveWidget(
  { request }: ActionFunctionArgs,
  type: WidgetType,
): Promise<WidgetActionData> {
  const { admin, session } = await authenticate.admin(request);
  const form = await request.formData();

  let payload: { intent?: unknown; enabled?: unknown; config?: unknown };
  try {
    payload = JSON.parse(String(form.get("payload") ?? "{}"));
  } catch {
    return { ok: false, synced: false, error: "Invalid form data", widget: null };
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, synced: false, error: "Invalid form data", widget: null };
  }

  let persisted: WidgetRow;
  try {
    if (payload.intent === "toggle") {
      persisted = await setWidgetEnabled(session.shop, type, Boolean(payload.enabled));
    } else {
      persisted = await upsertWidget(session.shop, type, {
        enabled: Boolean(payload.enabled),
        config: payload.config,
      });
    }
  } catch {
    return { ok: false, synced: false, error: "Could not save. Please try again.", widget: null };
  }

  const sync = await syncStorefrontConfig(admin, session.shop);
  return {
    ok: true,
    synced: sync.ok,
    error: sync.ok ? null : sync.error,
    widget: persisted,
  };
}
