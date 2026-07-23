import { useMemo } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { BlockStack, Checkbox, Divider, Page, Text, TextField } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";

import { loadWidget, saveWidget } from "../lib/widget-route.server";
import { GlobalSettingsPanel } from "../components/settings/GlobalSettingsPanel";
import { WidgetSettingsForm } from "../components/settings/WidgetSettingsForm";
import { useWidgetSettingsForm } from "../components/settings/useWidgetSettingsForm";
import { StickyCartPreview } from "../components/settings/StickyCartPreview";
import type { StickyAtcConfig } from "../lib/widget-config";

export const loader = (args: LoaderFunctionArgs) => loadWidget(args, "STICKY_ATC");
export const action = (args: ActionFunctionArgs) => saveWidget(args, "STICKY_ATC");

export default function StickyCartSettings() {
  const { widget } = useLoaderData<typeof loader>();
  const initial = useMemo(
    () => ({
      enabled: widget.enabled,
      global: widget.config.global,
      widget: widget.config.widget as unknown as StickyAtcConfig,
    }),
    [widget],
  );
  const form = useWidgetSettingsForm(initial);
  const { widget: sticky, setWidget: setSticky } = form;

  return (
    <Page backAction={{ content: "Dashboard", url: "/app" }} title="Sticky Add to Cart">
      <TitleBar title="Sticky Add to Cart" />
      <WidgetSettingsForm
        description="A persistent Add to cart bar that keeps the buy button in view as shoppers scroll the product page."
        enabled={form.enabled}
        onToggleEnabled={form.toggleEnabled}
        onSave={form.save}
        saving={form.saving}
        dirty={form.dirty}
        banner={form.banner}
        onDismissBanner={() => form.setBanner(null)}
        preview={<StickyCartPreview global={form.global} sticky={sticky} />}
        settings={
          <BlockStack gap="500">
            <GlobalSettingsPanel value={form.global} onChange={form.setGlobal} />
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
