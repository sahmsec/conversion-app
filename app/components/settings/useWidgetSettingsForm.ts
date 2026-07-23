import { useCallback, useEffect, useRef, useState } from "react";
import { useFetcher } from "@remix-run/react";
import { useAppBridge } from "@shopify/app-bridge-react";
import type { GlobalWidgetSettings } from "../../lib/widget-config";
import type { WidgetFormBanner } from "./WidgetSettingsForm";

type ActionData = {
  ok: boolean;
  synced: boolean;
  error: string | null;
  widget: {
    enabled: boolean;
    config: { global: GlobalWidgetSettings; widget: Record<string, unknown> };
  } | null;
};

export type WidgetFormInitial<W> = {
  enabled: boolean;
  global: GlobalWidgetSettings;
  widget: W;
};

/**
 * Shared state + save behavior for every widget settings screen.
 *  - save(): full save of enabled + config. On success the form + baseline adopt
 *    the server's PERSISTED (normalized) values, so the UI never claims a value it
 *    didn't actually store.
 *  - toggleEnabled(): patches only the enable flag (never commits config drafts or
 *    clobbers saved config).
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

  const lastIntentRef = useRef<"save" | "toggle">("save");
  const toggledEnabledRef = useRef(initial.enabled);

  const save = useCallback(() => {
    lastIntentRef.current = "save";
    fetcher.submit(
      { payload: JSON.stringify({ intent: "save", enabled, config: { global, widget } }) },
      { method: "POST" },
    );
  }, [enabled, global, widget, fetcher]);

  // On/off toggle persists the enable flag ALONE — immediately, no separate Save,
  // and without touching the config the merchant may be mid-editing.
  const toggleEnabled = useCallback(
    (next: boolean) => {
      lastIntentRef.current = "toggle";
      toggledEnabledRef.current = next;
      setEnabled(next);
      fetcher.submit(
        { payload: JSON.stringify({ intent: "toggle", enabled: next }) },
        { method: "POST" },
      );
    },
    [fetcher],
  );

  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data) return;
    const data = fetcher.data;

    if (data.ok) {
      if (lastIntentRef.current === "save" && data.widget) {
        // Adopt what the server actually persisted (post-normalization).
        const w = data.widget;
        const g = w.config.global;
        const ws = w.config.widget as unknown as W;
        setEnabled(w.enabled);
        setGlobal(g);
        setWidget(ws);
        setBaseline({ enabled: w.enabled, global: g, widget: ws });
      } else {
        // Toggle only changed the enable flag; keep config state/drafts intact.
        setBaseline((b) => ({ ...b, enabled: toggledEnabledRef.current }));
      }

      if (data.synced) {
        setBanner({ tone: "success", content: "Saved and published to your storefront." });
        shopify.toast.show("Saved");
      } else {
        setBanner({
          tone: "warning",
          content:
            "Saved, but publishing to the storefront failed. Press Save again to retry.",
        });
      }
    } else {
      setBanner({ tone: "critical", content: data.error || "Could not save. Please try again." });
    }
    // React only to a completed submission.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher.state, fetcher.data]);

  return {
    enabled,
    setEnabled,
    toggleEnabled,
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
