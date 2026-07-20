import { useMemo } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { BlockStack, Checkbox, Divider, Page, Text, TextField } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";

import { loadWidget, saveWidget } from "../lib/widget-route.server";
import { GlobalSettingsPanel } from "../components/settings/GlobalSettingsPanel";
import { WidgetSettingsForm } from "../components/settings/WidgetSettingsForm";
import { useWidgetSettingsForm } from "../components/settings/useWidgetSettingsForm";
import { MoneyField } from "../components/settings/MoneyField";
import { ProgressBarPreview } from "../components/settings/ProgressBarPreview";
import type { FreeShippingBarConfig } from "../lib/widget-config";

export const loader = (args: LoaderFunctionArgs) => loadWidget(args, "FREE_SHIPPING_BAR");
export const action = (args: ActionFunctionArgs) => saveWidget(args, "FREE_SHIPPING_BAR");

export default function FreeShippingBarSettings() {
  const { widget } = useLoaderData<typeof loader>();
  const initial = useMemo(
    () => ({
      enabled: widget.enabled,
      global: widget.config.global,
      widget: widget.config.widget as unknown as FreeShippingBarConfig,
    }),
    [widget],
  );
  const form = useWidgetSettingsForm(initial);
  const { widget: cfg, setWidget: setCfg } = form;

  return (
    <Page backAction={{ content: "Dashboard", url: "/app" }} title="Free Shipping Bar">
      <TitleBar title="Free Shipping Bar" />
      <WidgetSettingsForm
        description="A dynamic bar showing shoppers how much more they need to spend to unlock free shipping."
        enabled={form.enabled}
        onToggleEnabled={form.setEnabled}
        onSave={form.save}
        saving={form.saving}
        dirty={form.dirty}
        banner={form.banner}
        onDismissBanner={() => form.setBanner(null)}
        preview={
          <ProgressBarPreview
            global={form.global}
            message={cfg.messageBefore}
            goalCents={cfg.goalCents}
            showProgressBar={cfg.showProgressBar}
          />
        }
        settings={
          <BlockStack gap="500">
            <GlobalSettingsPanel value={form.global} onChange={form.setGlobal} />
            <Divider />
            <BlockStack gap="300">
              <Text as="h3" variant="headingSm">
                Free shipping goal
              </Text>
              <MoneyField
                label="Goal amount"
                cents={cfg.goalCents}
                onChangeCents={(goalCents) => setCfg({ ...cfg, goalCents })}
                helpText="Amount in your store currency (e.g. 50 = $50)."
              />
              <TextField
                label="Message before goal is met"
                value={cfg.messageBefore}
                onChange={(messageBefore) => setCfg({ ...cfg, messageBefore })}
                helpText="Use {{remaining}} for the amount left to spend."
                autoComplete="off"
                multiline
              />
              <TextField
                label="Message when goal is met"
                value={cfg.messageAfter}
                onChange={(messageAfter) => setCfg({ ...cfg, messageAfter })}
                autoComplete="off"
                multiline
              />
              <Checkbox
                label="Show progress bar"
                checked={cfg.showProgressBar}
                onChange={(showProgressBar) => setCfg({ ...cfg, showProgressBar })}
              />
            </BlockStack>
          </BlockStack>
        }
      />
    </Page>
  );
}
