import { useMemo } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Banner,
  BlockStack,
  Checkbox,
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
import { SalesPopPreview } from "../components/settings/SalesPopPreview";
import type { SalesPopConfig } from "../lib/widget-config";

export const loader = (args: LoaderFunctionArgs) => loadWidget(args, "SALES_POP");
export const action = (args: ActionFunctionArgs) => saveWidget(args, "SALES_POP");

export default function SalesPopSettings() {
  const { widget } = useLoaderData<typeof loader>();
  const initial = useMemo(
    () => ({
      enabled: widget.enabled,
      global: widget.config.global,
      widget: widget.config.widget as unknown as SalesPopConfig,
    }),
    [widget],
  );
  const form = useWidgetSettingsForm(initial);
  const { widget: cfg, setWidget: setCfg } = form;

  const num = (v: string, min: number, max: number) => {
    const n = parseInt(v, 10);
    if (!Number.isFinite(n)) return min;
    return Math.min(max, Math.max(min, n));
  };

  return (
    <Page backAction={{ content: "Dashboard", url: "/app" }} title="Sales Pop">
      <TitleBar title="Sales Pop" />
      <WidgetSettingsForm
        description="Show real recent-order social proof — small popups like “Someone in Austin just purchased…”. Uses your actual orders (no fake data), with no customer names shown."
        enabled={form.enabled}
        onToggleEnabled={form.toggleEnabled}
        onSave={form.save}
        saving={form.saving}
        dirty={form.dirty}
        banner={form.banner}
        onDismissBanner={() => form.setBanner(null)}
        preview={<SalesPopPreview global={form.global} config={cfg} />}
        settings={
          <BlockStack gap="500">
            <Banner tone="info">
              <Text as="p" variant="bodyMd">
                Popups are powered by your real orders. New orders start appearing here
                automatically once the app has the order-read permission — you may be
                asked to approve it the next time you open the app.
              </Text>
            </Banner>

            <GlobalSettingsPanel value={form.global} onChange={form.setGlobal} />
            <Divider />

            <BlockStack gap="300">
              <Text as="h3" variant="headingSm">
                Sales Pop
              </Text>

              <TextField
                label="Message"
                value={cfg.template}
                onChange={(template) => setCfg({ ...cfg, template })}
                helpText="Use {{product}} and {{location}} where those values should appear."
                autoComplete="off"
              />

              <Select
                label="Position"
                options={[
                  { label: "Bottom left", value: "left" },
                  { label: "Bottom right", value: "right" },
                ]}
                value={cfg.corner}
                onChange={(corner) =>
                  setCfg({ ...cfg, corner: corner as SalesPopConfig["corner"] })
                }
              />

              <InlineGrid columns={{ xs: 1, sm: 3 }} gap="300">
                <TextField
                  label="Show each for (seconds)"
                  type="number"
                  min={2}
                  max={30}
                  value={String(cfg.durationSeconds)}
                  onChange={(v) => setCfg({ ...cfg, durationSeconds: num(v, 2, 30) })}
                  autoComplete="off"
                />
                <TextField
                  label="Gap between (seconds)"
                  type="number"
                  min={3}
                  max={120}
                  value={String(cfg.intervalSeconds)}
                  onChange={(v) => setCfg({ ...cfg, intervalSeconds: num(v, 3, 120) })}
                  autoComplete="off"
                />
                <TextField
                  label="Max per visit"
                  type="number"
                  min={0}
                  max={100}
                  value={String(cfg.maxPerSession)}
                  onChange={(v) => setCfg({ ...cfg, maxPerSession: num(v, 0, 100) })}
                  autoComplete="off"
                  helpText="0 = no limit"
                />
              </InlineGrid>

              <Checkbox
                label="Show buyer location (city / region)"
                checked={cfg.showLocation}
                onChange={(showLocation) => setCfg({ ...cfg, showLocation })}
                helpText="No names are ever shown — location only."
              />
              <Checkbox
                label="Show how long ago the order was placed"
                checked={cfg.showTimeAgo}
                onChange={(showTimeAgo) => setCfg({ ...cfg, showTimeAgo })}
              />
            </BlockStack>
          </BlockStack>
        }
      />
    </Page>
  );
}
