import { useMemo } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  BlockStack,
  Checkbox,
  Divider,
  Page,
  RangeSlider,
  Text,
  TextField,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";

import { loadWidget, saveWidget } from "../lib/widget-route.server";
import { GlobalSettingsPanel } from "../components/settings/GlobalSettingsPanel";
import { WidgetSettingsForm } from "../components/settings/WidgetSettingsForm";
import { useWidgetSettingsForm } from "../components/settings/useWidgetSettingsForm";
import { AnnouncementBarPreview } from "../components/settings/AnnouncementBarPreview";
import type { AnnouncementBarConfig } from "../lib/widget-config";

export const loader = (args: LoaderFunctionArgs) => loadWidget(args, "ANNOUNCEMENT_BAR");
export const action = (args: ActionFunctionArgs) => saveWidget(args, "ANNOUNCEMENT_BAR");

export default function AnnouncementBarSettings() {
  const { widget } = useLoaderData<typeof loader>();
  const initial = useMemo(
    () => ({
      enabled: widget.enabled,
      global: widget.config.global,
      widget: widget.config.widget as unknown as AnnouncementBarConfig,
    }),
    [widget],
  );
  const form = useWidgetSettingsForm(initial);
  const { widget: cfg, setWidget: setCfg } = form;

  return (
    <Page backAction={{ content: "Dashboard", url: "/app" }} title="Announcement Bar">
      <TitleBar title="Announcement Bar" />
      <WidgetSettingsForm
        description="A rotating announcement bar for promotions, shipping notices, and countdowns."
        enabled={form.enabled}
        onToggleEnabled={form.toggleEnabled}
        onSave={form.save}
        saving={form.saving}
        dirty={form.dirty}
        banner={form.banner}
        onDismissBanner={() => form.setBanner(null)}
        preview={<AnnouncementBarPreview global={form.global} config={cfg} />}
        settings={
          <BlockStack gap="500">
            <GlobalSettingsPanel value={form.global} onChange={form.setGlobal} />
            <Divider />
            <BlockStack gap="300">
              <Text as="h3" variant="headingSm">
                Announcement
              </Text>
              <TextField
                label="Messages (one per line — they rotate)"
                value={cfg.messages.join("\n")}
                onChange={(v) => setCfg({ ...cfg, messages: v.split("\n") })}
                autoComplete="off"
                multiline={3}
              />
              <RangeSlider
                label={`Rotation speed: ${(cfg.rotateMs / 1000).toFixed(1)}s`}
                min={1000}
                max={15000}
                step={500}
                value={cfg.rotateMs}
                onChange={(v) => setCfg({ ...cfg, rotateMs: Number(v) })}
                output
              />
              <TextField
                label="Link URL (optional)"
                value={cfg.link}
                onChange={(link) => setCfg({ ...cfg, link })}
                placeholder="https://…"
                autoComplete="off"
              />
              <TextField
                label="Countdown end (optional)"
                type="datetime-local"
                value={cfg.countdownTo ?? ""}
                onChange={(v) => setCfg({ ...cfg, countdownTo: v || null })}
                helpText="Shows a live countdown timer alongside the message."
                autoComplete="off"
              />
              <Checkbox
                label="Allow shoppers to dismiss the bar"
                checked={cfg.dismissible}
                onChange={(dismissible) => setCfg({ ...cfg, dismissible })}
              />
            </BlockStack>
          </BlockStack>
        }
      />
    </Page>
  );
}
