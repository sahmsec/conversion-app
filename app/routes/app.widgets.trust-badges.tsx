import { useMemo } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  BlockStack,
  ChoiceList,
  Divider,
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
import { TrustBadgesPreview } from "../components/settings/TrustBadgesPreview";
import { TRUST_BADGE_META } from "../lib/trust-badges";
import {
  TRUST_BADGE_KEYS,
  type TrustBadgeKey,
  type TrustBadgesConfig,
} from "../lib/widget-config";

export const loader = (args: LoaderFunctionArgs) => loadWidget(args, "TRUST_BADGES");
export const action = (args: ActionFunctionArgs) => saveWidget(args, "TRUST_BADGES");

const BADGE_CHOICES = TRUST_BADGE_KEYS.map((key) => ({
  label: TRUST_BADGE_META[key].label,
  value: key,
}));

export default function TrustBadgesSettings() {
  const { widget } = useLoaderData<typeof loader>();
  const initial = useMemo(
    () => ({
      enabled: widget.enabled,
      global: widget.config.global,
      widget: widget.config.widget as unknown as TrustBadgesConfig,
    }),
    [widget],
  );
  const form = useWidgetSettingsForm(initial);
  const { widget: cfg, setWidget: setCfg } = form;

  return (
    <Page backAction={{ content: "Dashboard", url: "/app" }} title="Trust Badges">
      <TitleBar title="Trust Badges" />
      <WidgetSettingsForm
        description="Show payment, security, and guarantee badges near the buy button to build shopper confidence."
        enabled={form.enabled}
        onToggleEnabled={form.toggleEnabled}
        onSave={form.save}
        saving={form.saving}
        dirty={form.dirty}
        banner={form.banner}
        onDismissBanner={() => form.setBanner(null)}
        preview={<TrustBadgesPreview config={cfg} />}
        settings={
          <BlockStack gap="500">
            <GlobalSettingsPanel value={form.global} onChange={form.setGlobal} />
            <Divider />
            <BlockStack gap="300">
              <Text as="h3" variant="headingSm">
                Badges
              </Text>
              <TextField
                label="Heading"
                value={cfg.heading}
                onChange={(heading) => setCfg({ ...cfg, heading })}
                autoComplete="off"
              />
              <ChoiceList
                allowMultiple
                title="Show these badges"
                choices={BADGE_CHOICES}
                selected={cfg.badges}
                onChange={(selected) =>
                  setCfg({ ...cfg, badges: selected as TrustBadgeKey[] })
                }
              />
              <Select
                label="Alignment"
                options={[
                  { label: "Left", value: "left" },
                  { label: "Center", value: "center" },
                  { label: "Right", value: "right" },
                ]}
                value={cfg.alignment}
                onChange={(alignment) =>
                  setCfg({ ...cfg, alignment: alignment as TrustBadgesConfig["alignment"] })
                }
              />
            </BlockStack>
          </BlockStack>
        }
      />
    </Page>
  );
}
