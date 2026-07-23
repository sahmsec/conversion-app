import { useMemo } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Banner,
  BlockStack,
  Divider,
  InlineGrid,
  Page,
  Select,
  Text,
  TextField,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";

import { loadWidget, saveWidget } from "../lib/widget-route.server";
import { GlobalSettingsPanel } from "../components/settings/GlobalSettingsPanel";
import { WidgetSettingsForm } from "../components/settings/WidgetSettingsForm";
import { useWidgetSettingsForm } from "../components/settings/useWidgetSettingsForm";
import { UpsellPreview } from "../components/settings/UpsellPreview";
import type { UpsellConfig } from "../lib/widget-config";

export const loader = (args: LoaderFunctionArgs) => loadWidget(args, "UPSELL");
export const action = (args: ActionFunctionArgs) => saveWidget(args, "UPSELL");

export default function UpsellSettings() {
  const { widget } = useLoaderData<typeof loader>();
  const initial = useMemo(
    () => ({
      enabled: widget.enabled,
      global: widget.config.global,
      widget: widget.config.widget as unknown as UpsellConfig,
    }),
    [widget],
  );
  const form = useWidgetSettingsForm(initial);
  const { widget: cfg, setWidget: setCfg } = form;

  return (
    <Page backAction={{ content: "Dashboard", url: "/app" }} title="Upsell">
      <TitleBar title="Upsell" />
      <WidgetSettingsForm
        description="Show “you may also like” product recommendations on your product pages, with one-tap add-to-cart. Recommendations come from Shopify automatically — no manual product picking."
        enabled={form.enabled}
        onToggleEnabled={form.toggleEnabled}
        onSave={form.save}
        saving={form.saving}
        dirty={form.dirty}
        banner={form.banner}
        onDismissBanner={() => form.setBanner(null)}
        preview={<UpsellPreview global={form.global} config={cfg} />}
        settings={
          <BlockStack gap="500">
            <GlobalSettingsPanel value={form.global} onChange={form.setGlobal} />
            <Divider />
            <BlockStack gap="300">
              <Text as="h3" variant="headingSm">
                Recommendations
              </Text>
              <TextField
                label="Heading"
                value={cfg.heading}
                onChange={(heading) => setCfg({ ...cfg, heading })}
                autoComplete="off"
              />
              <Select
                label="Recommendation type"
                options={[
                  { label: "Related products (you may also like)", value: "related" },
                  {
                    label: "Complementary (frequently bought together)",
                    value: "complementary",
                  },
                ]}
                value={cfg.intent}
                onChange={(intent) =>
                  setCfg({ ...cfg, intent: intent as UpsellConfig["intent"] })
                }
                helpText="Complementary needs Shopify's free Search & Discovery app configured; related works out of the box."
              />
              <InlineGrid columns={{ xs: 1, sm: 3 }} gap="300">
                <Select
                  label="Layout"
                  options={[
                    { label: "Row (scroll)", value: "row" },
                    { label: "Grid (wrap)", value: "grid" },
                  ]}
                  value={cfg.layout}
                  onChange={(layout) =>
                    setCfg({ ...cfg, layout: layout as UpsellConfig["layout"] })
                  }
                />
                <TextField
                  label="Max products"
                  type="number"
                  min={1}
                  max={10}
                  value={String(cfg.maxItems)}
                  onChange={(v) =>
                    setCfg({ ...cfg, maxItems: Math.min(10, Math.max(1, parseInt(v, 10) || 1)) })
                  }
                  autoComplete="off"
                />
                <TextField
                  label="Button text"
                  value={cfg.ctaText}
                  onChange={(ctaText) => setCfg({ ...cfg, ctaText })}
                  autoComplete="off"
                />
              </InlineGrid>
              <Banner tone="info">
                <Text as="p" variant="bodyMd">
                  The upsell appears on product pages, just below the buy section.
                </Text>
              </Banner>
            </BlockStack>
          </BlockStack>
        }
      />
    </Page>
  );
}
