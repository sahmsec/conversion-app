import { useCallback, useEffect, useRef, useState } from "react";
import { useFetcher } from "@remix-run/react";
import { useAppBridge } from "@shopify/app-bridge-react";
import type { GlobalWidgetSettings } from "../../lib/widget-config";
import type { WidgetFormBanner } from "./WidgetSettingsForm";

type ActionData = { ok: boolean; synced: boolean; error: string | null };

export type WidgetFormInitial<W> = {
  enabled: boolean;
  global: GlobalWidgetSettings;
  widget: W;
};

/**
 * Shared state + save behavior for every widget settings screen. Tracks the
 * enable flag, global settings, and the widget-specific config; computes a dirty
 * flag; submits `{ enabled, config: { global, widget } }` to the route action; and
 * surfaces a success/warning/critical banner from the sync result.
 */
export function useWidgetSettingsForm<W>(initial: WidgetFormInitial<W>) {
  const fetcher = useFetcher<ActionData>();
  const shopify = useAppBridge();

  const [enabled, setEnabled] = useState(initial.enabled);
  const [global, setGlobal] = useState<GlobalWidgetSettings>(initial.global);
  const [widget, setWidget] = useState<W>(initial.widget);
  const [baseline, setBaseline] = useState(initial);
  const [banner, setBanner] = useState<WidgetFormBanner>(null);

  const saving = fetcher.state !== "idle";
  const dirty =
    JSON.stringify({ enabled, global, widget }) !== JSON.stringify(baseline);

  // Snapshot of exactly what was submitted, so the baseline reflects the payload
  // that was sent — not any edits the merchant made while the save was in flight.
  const submittedRef = useRef(initial);
  const save = useCallback(() => {
    submittedRef.current = { enabled, global, widget };
    fetcher.submit(
      { payload: JSON.stringify({ enabled, config: { global, widget } }) },
      { method: "POST" },
    );
  }, [enabled, global, widget, fetcher]);

  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data) return;
    if (fetcher.data.ok && fetcher.data.synced) {
      // Baseline = what was actually submitted; edits made mid-save stay dirty.
      setBaseline(submittedRef.current);
      setBanner({ tone: "success", content: "Saved and published to your storefront." });
      shopify.toast.show("Saved");
    } else if (fetcher.data.ok) {
      // DB saved but the storefront publish failed. Do NOT reset the baseline: keep
      // the form dirty so the Save button stays enabled for the "Save again" retry.
      setBanner({
        tone: "warning",
        content:
          "Saved, but publishing to the storefront failed. Press Save again to retry.",
      });
    } else {
      setBanner({ tone: "critical", content: "Could not save. Please try again." });
    }
    // React only to a completed submission.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher.state, fetcher.data]);

  return {
    enabled,
    setEnabled,
    global,
    setGlobal,
    widget,
    setWidget,
    saving,
    dirty,
    save,
    banner,
    setBanner,
  };
}
