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
import type { CartGoalConfig } from "../lib/widget-config";

export const loader = (args: LoaderFunctionArgs) => loadWidget(args, "CART_GOAL");
export const action = (args: ActionFunctionArgs) => saveWidget(args, "CART_GOAL");

export default function CartGoalSettings() {
  const { widget } = useLoaderData<typeof loader>();
  const initial = useMemo(
    () => ({
      enabled: widget.enabled,
      global: widget.config.global,
      widget: widget.config.widget as unknown as CartGoalConfig,
    }),
    [widget],
  );
  const form = useWidgetSettingsForm(initial);
  const { widget: cfg, setWidget: setCfg } = form;

  return (
    <Page backAction={{ content: "Dashboard", url: "/app" }} title="Cart Goal">
      <TitleBar title="Cart Goal" />
      <WidgetSettingsForm
        description="Nudge shoppers to spend a little more to unlock a reward such as a free gift."
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
            reward={cfg.reward}
          />
        }
        settings={
          <BlockStack gap="500">
            <GlobalSettingsPanel value={form.global} onChange={form.setGlobal} />
            <Divider />
            <BlockStack gap="300">
              <Text as="h3" variant="headingSm">
                Reward goal
              </Text>
              <MoneyField
                label="Goal amount"
                cents={cfg.goalCents}
                onChangeCents={(goalCents) => setCfg({ ...cfg, goalCents })}
                helpText="Amount in your store currency (e.g. 75 = $75)."
              />
              <TextField
                label="Reward"
                value={cfg.reward}
                onChange={(reward) => setCfg({ ...cfg, reward })}
                helpText="What the shopper unlocks, e.g. “a free gift”."
                autoComplete="off"
              />
              <TextField
                label="Message before goal is met"
                value={cfg.messageBefore}
                onChange={(messageBefore) => setCfg({ ...cfg, messageBefore })}
                helpText="Use {{remaining}} for the amount left and {{reward}} for the reward."
                autoComplete="off"
                multiline
              />
              <TextField
                label="Message when goal is met"
                value={cfg.messageAfter}
                onChange={(messageAfter) => setCfg({ ...cfg, messageAfter })}
                helpText="Use {{reward}} for the reward."
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
