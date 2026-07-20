import { useCallback, useEffect, useMemo, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import {
  BlockStack,
  Checkbox,
  Divider,
  Page,
  Text,
  TextField,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";

import { authenticate } from "../shopify.server";
import { getWidget, upsertWidget } from "../models/widget.server";
import { syncStorefrontConfig } from "../services/metafield-sync.server";
import { GlobalSettingsPanel } from "../components/settings/GlobalSettingsPanel";
import {
  WidgetSettingsForm,
  type WidgetFormBanner,
} from "../components/settings/WidgetSettingsForm";
import { StickyCartPreview } from "../components/settings/StickyCartPreview";
import type {
  GlobalWidgetSettings,
  StickyAtcConfig,
} from "../lib/widget-config";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const widget = await getWidget(session.shop, "STICKY_ATC");
  return { widget };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const form = await request.formData();

  let payload: { enabled?: unknown; config?: unknown };
  try {
    payload = JSON.parse(String(form.get("payload") ?? "{}"));
  } catch {
    return { ok: false, synced: false, error: "Invalid form data" };
  }

  await upsertWidget(session.shop, "STICKY_ATC", {
    enabled: Boolean(payload.enabled),
    config: payload.config,
  });

  // Publish to the storefront. A sync failure does NOT fail the save.
  const sync = await syncStorefrontConfig(admin, session.shop);
  return { ok: true, synced: sync.ok, error: sync.ok ? null : sync.error };
};

export default function StickyCartSettings() {
  const { widget } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();

  const initial = useMemo(
    () => ({
      enabled: widget.enabled,
      global: widget.config.global,
      sticky: widget.config.widget as unknown as StickyAtcConfig,
    }),
    [widget],
  );

  const [enabled, setEnabled] = useState(initial.enabled);
  const [global, setGlobal] = useState<GlobalWidgetSettings>(initial.global);
  const [sticky, setSticky] = useState<StickyAtcConfig>(initial.sticky);
  const [baseline, setBaseline] = useState(initial);
  const [banner, setBanner] = useState<WidgetFormBanner>(null);

  const saving = fetcher.state !== "idle";
  const dirty =
    JSON.stringify({ enabled, global, sticky }) !== JSON.stringify(baseline);

  const save = useCallback(() => {
    fetcher.submit(
      { payload: JSON.stringify({ enabled, config: { global, widget: sticky } }) },
      { method: "POST" },
    );
  }, [enabled, global, sticky, fetcher]);

  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data) return;
    if (fetcher.data.ok && fetcher.data.synced) {
      setBaseline({ enabled, global, sticky });
      setBanner({ tone: "success", content: "Saved and published to your storefront." });
      shopify.toast.show("Saved");
    } else if (fetcher.data.ok) {
      setBaseline({ enabled, global, sticky });
      setBanner({
        tone: "warning",
        content:
          "Saved, but publishing to the storefront failed. Press Save again to retry.",
      });
    } else {
      setBanner({ tone: "critical", content: "Could not save. Please try again." });
    }
    // Only react to a completed submission.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher.state, fetcher.data]);

  return (
    <Page
      backAction={{ content: "Dashboard", url: "/app" }}
      title="Sticky Add to Cart"
    >
      <TitleBar title="Sticky Add to Cart" />
      <WidgetSettingsForm
        description="A persistent Add to cart bar that keeps the buy button in view as shoppers scroll the product page."
        enabled={enabled}
        onToggleEnabled={setEnabled}
        onSave={save}
        saving={saving}
        dirty={dirty}
        banner={banner}
        onDismissBanner={() => setBanner(null)}
        preview={<StickyCartPreview global={global} sticky={sticky} />}
        settings={
          <BlockStack gap="500">
            <GlobalSettingsPanel value={global} onChange={setGlobal} />
            <Divider />
            <BlockStack gap="300">
              <Text as="h3" variant="headingSm">
                Sticky bar options
              </Text>
              <TextField
                label="Button text"
                value={sticky.ctaText}
                onChange={(ctaText) => setSticky({ ...sticky, ctaText })}
                autoComplete="off"
                maxLength={40}
                showCharacterCount
              />
              <Checkbox
                label="Show quantity selector"
                checked={sticky.showQuantity}
                onChange={(showQuantity) => setSticky({ ...sticky, showQuantity })}
              />
              <Checkbox
                label={'Show "Buy now" button'}
                checked={sticky.showBuyNow}
                onChange={(showBuyNow) => setSticky({ ...sticky, showBuyNow })}
              />
              <Checkbox
                label="Only appear after the theme's Add to cart button scrolls out of view"
                checked={sticky.showAfterScroll}
                onChange={(showAfterScroll) => setSticky({ ...sticky, showAfterScroll })}
              />
            </BlockStack>
          </BlockStack>
        }
      />
    </Page>
  );
}
