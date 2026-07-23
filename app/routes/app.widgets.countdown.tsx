import { useMemo } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { BlockStack, Checkbox, Divider, Page, Select, Text, TextField } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";

import { loadWidget, saveWidget } from "../lib/widget-route.server";
import { GlobalSettingsPanel } from "../components/settings/GlobalSettingsPanel";
import { WidgetSettingsForm } from "../components/settings/WidgetSettingsForm";
import { useWidgetSettingsForm } from "../components/settings/useWidgetSettingsForm";
import { CountdownPreview } from "../components/settings/CountdownPreview";
import type { CountdownConfig } from "../lib/widget-config";

export const loader = (args: LoaderFunctionArgs) => loadWidget(args, "COUNTDOWN");
export const action = (args: ActionFunctionArgs) => saveWidget(args, "COUNTDOWN");

export default function CountdownSettings() {
  const { widget } = useLoaderData<typeof loader>();
  const initial = useMemo(
    () => ({
      enabled: widget.enabled,
      global: widget.config.global,
      widget: widget.config.widget as unknown as CountdownConfig,
    }),
    [widget],
  );
  const form = useWidgetSettingsForm(initial);
  const { widget: cfg, setWidget: setCfg } = form;

  return (
    <Page backAction={{ content: "Dashboard", url: "/app" }} title="Countdown Timer">
      <TitleBar title="Countdown Timer" />
      <WidgetSettingsForm
        description="A countdown/urgency bar that drives FOMO — count down to a sale end date, or give each visitor a personal timer."
        enabled={form.enabled}
        onToggleEnabled={form.toggleEnabled}
        onSave={form.save}
        saving={form.saving}
        dirty={form.dirty}
        banner={form.banner}
        onDismissBanner={() => form.setBanner(null)}
        preview={<CountdownPreview global={form.global} config={cfg} />}
        settings={
          <BlockStack gap="500">
            <GlobalSettingsPanel value={form.global} onChange={form.setGlobal} />
            <Divider />
            <BlockStack gap="300">
              <Text as="h3" variant="headingSm">
                Countdown
              </Text>
              <Select
                label="Type"
                options={[
                  { label: "Count down to a date", value: "fixed" },
                  { label: "Per-visitor timer (evergreen)", value: "evergreen" },
                ]}
                value={cfg.mode}
                onChange={(m) => setCfg({ ...cfg, mode: m as CountdownConfig["mode"] })}
              />
              {cfg.mode === "fixed" ? (
                <TextField
                  label="End date & time"
                  type="datetime-local"
                  value={cfg.endAt ?? ""}
                  onChange={(v) => setCfg({ ...cfg, endAt: v || null })}
                  autoComplete="off"
                />
              ) : (
                <TextField
                  label="Timer length (minutes)"
                  type="number"
                  min={1}
                  value={String(cfg.durationMinutes)}
                  onChange={(v) =>
                    setCfg({ ...cfg, durationMinutes: Math.max(1, parseInt(v, 10) || 1) })
                  }
                  autoComplete="off"
                  helpText="Each visitor gets their own countdown of this length."
                />
              )}
              <TextField
                label="Message"
                value={cfg.message}
                onChange={(message) => setCfg({ ...cfg, message })}
                helpText="Use {{timer}} where the countdown should appear."
                autoComplete="off"
              />
              <TextField
                label="Message when expired"
                value={cfg.expiredMessage}
                onChange={(expiredMessage) => setCfg({ ...cfg, expiredMessage })}
                autoComplete="off"
              />
              <Checkbox
                label="Hide the bar when the countdown ends"
                checked={cfg.hideOnExpire}
                onChange={(hideOnExpire) => setCfg({ ...cfg, hideOnExpire })}
              />
            </BlockStack>
          </BlockStack>
        }
      />
    </Page>
  );
}
