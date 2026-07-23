import { useMemo } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Badge,
  Banner,
  BlockStack,
  Box,
  Button,
  Checkbox,
  Divider,
  InlineStack,
  Page,
  Text,
  TextField,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";

import { authenticate } from "../shopify.server";
import {
  getWidget,
  setWidgetEnabled,
  upsertWidget,
  type WidgetRow,
} from "../models/widget.server";
import { syncStorefrontConfig } from "../services/metafield-sync.server";
import { syncQuantityBreaksDiscount } from "../models/discount.server";
import type { WidgetActionData } from "../lib/widget-route.server";
import { GlobalSettingsPanel } from "../components/settings/GlobalSettingsPanel";
import { WidgetSettingsForm } from "../components/settings/WidgetSettingsForm";
import { useWidgetSettingsForm } from "../components/settings/useWidgetSettingsForm";
import { QuantityBreaksPreview } from "../components/settings/QuantityBreaksPreview";
import type { QuantityBreaksConfig } from "../lib/widget-config";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const widget = await getWidget(session.shop, "QUANTITY_BREAKS");
  return { widget };
};

/**
 * Custom action (not the shared saveWidget): quantity breaks must also reconcile
 * the Shopify automatic discount and persist the resulting discount id back onto
 * the widget config. Handles both the on/off toggle and full saves.
 */
export const action = async ({ request }: ActionFunctionArgs): Promise<WidgetActionData> => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;
  const form = await request.formData();

  let payload: { intent?: unknown; enabled?: unknown; config?: unknown };
  try {
    payload = JSON.parse(String(form.get("payload") ?? "{}"));
  } catch {
    return { ok: false, synced: false, error: "Invalid form data", widget: null };
  }

  let persisted: WidgetRow;
  try {
    if (payload.intent === "toggle") {
      persisted = await setWidgetEnabled(shop, "QUANTITY_BREAKS", Boolean(payload.enabled));
    } else {
      persisted = await upsertWidget(shop, "QUANTITY_BREAKS", {
        enabled: Boolean(payload.enabled),
        config: payload.config,
      });
    }
  } catch {
    return { ok: false, synced: false, error: "Could not save. Please try again.", widget: null };
  }

  const cfg = persisted.config.widget as unknown as QuantityBreaksConfig;

  // Reconcile the automatic discount, then persist any new/cleared discount id.
  const disc = await syncQuantityBreaksDiscount(admin, {
    enabled: persisted.enabled,
    tiers: cfg.tiers,
    variantIds: cfg.variantIds,
    discountId: cfg.discountId,
  });
  if (disc.discountId !== cfg.discountId) {
    persisted = await upsertWidget(shop, "QUANTITY_BREAKS", {
      enabled: persisted.enabled,
      config: {
        global: persisted.config.global,
        widget: { ...cfg, discountId: disc.discountId },
      },
    });
  }

  const sync = await syncStorefrontConfig(admin, shop);
  return {
    ok: disc.ok,
    synced: sync.ok,
    error: disc.error ?? (sync.ok ? null : sync.error),
    widget: persisted,
  };
};

export default function QuantityBreaksSettings() {
  const { widget } = useLoaderData<typeof loader>();
  const initial = useMemo(
    () => ({
      enabled: widget.enabled,
      global: widget.config.global,
      widget: widget.config.widget as unknown as QuantityBreaksConfig,
    }),
    [widget],
  );
  const form = useWidgetSettingsForm(initial);
  const { widget: cfg, setWidget: setCfg } = form;

  const setTier = (i: number, patch: Partial<QuantityBreaksConfig["tiers"][number]>) =>
    setCfg({ ...cfg, tiers: cfg.tiers.map((t, idx) => (idx === i ? { ...t, ...patch } : t)) });
  const addTier = () => {
    const last = cfg.tiers[cfg.tiers.length - 1];
    setCfg({
      ...cfg,
      tiers: [...cfg.tiers, { minQuantity: (last?.minQuantity ?? 1) + 1, percent: 10 }],
    });
  };
  const removeTier = (i: number) =>
    setCfg({ ...cfg, tiers: cfg.tiers.filter((_, idx) => idx !== i) });

  const num = (v: string, min: number, max: number) =>
    Math.min(max, Math.max(min, parseInt(v, 10) || min));

  return (
    <Page backAction={{ content: "Dashboard", url: "/app" }} title="Quantity Breaks">
      <TitleBar title="Quantity Breaks" />
      <WidgetSettingsForm
        description="Reward bigger orders with a volume discount — “Buy 2 save 10%, buy 4 save 15%”. The discount is applied automatically at checkout by Shopify; the tier table is shown on your product pages."
        enabled={form.enabled}
        onToggleEnabled={form.toggleEnabled}
        onSave={form.save}
        saving={form.saving}
        dirty={form.dirty}
        banner={form.banner}
        onDismissBanner={() => form.setBanner(null)}
        preview={<QuantityBreaksPreview global={form.global} config={cfg} />}
        settings={
          <BlockStack gap="500">
            <Banner tone="info">
              <Text as="p" variant="bodyMd">
                The discount is enforced at checkout via a Shopify discount function and
                applies to all products. You may be asked to approve a “manage discounts”
                permission the next time you open the app.
              </Text>
            </Banner>

            <GlobalSettingsPanel value={form.global} onChange={form.setGlobal} />
            <Divider />

            <BlockStack gap="300">
              <Text as="h3" variant="headingSm">
                Discount tiers
              </Text>
              <TextField
                label="Heading (shown on product pages)"
                value={cfg.heading}
                onChange={(heading) => setCfg({ ...cfg, heading })}
                autoComplete="off"
              />

              <BlockStack gap="200">
                {cfg.tiers.map((tier, i) => (
                  <Box
                    key={i}
                    padding="300"
                    borderColor="border"
                    borderWidth="025"
                    borderRadius="200"
                    background="bg-surface-secondary"
                  >
                    <InlineStack gap="300" blockAlign="end" align="space-between">
                      <InlineStack gap="300" blockAlign="end">
                        <Box minWidth="120px">
                          <TextField
                            label="Buy at least"
                            type="number"
                            min={1}
                            suffix="items"
                            value={String(tier.minQuantity)}
                            onChange={(v) => setTier(i, { minQuantity: num(v, 1, 1000) })}
                            autoComplete="off"
                          />
                        </Box>
                        <Box minWidth="120px">
                          <TextField
                            label="Save"
                            type="number"
                            min={1}
                            max={100}
                            suffix="%"
                            value={String(tier.percent)}
                            onChange={(v) => setTier(i, { percent: num(v, 1, 100) })}
                            autoComplete="off"
                          />
                        </Box>
                      </InlineStack>
                      <Button
                        variant="tertiary"
                        tone="critical"
                        onClick={() => removeTier(i)}
                        disabled={cfg.tiers.length <= 1}
                      >
                        Remove
                      </Button>
                    </InlineStack>
                  </Box>
                ))}
                <InlineStack>
                  <Button onClick={addTier} disabled={cfg.tiers.length >= 10}>
                    Add tier
                  </Button>
                </InlineStack>
              </BlockStack>

              <Checkbox
                label="Highlight the biggest saving on the product page"
                checked={cfg.highlightBest}
                onChange={(highlightBest) => setCfg({ ...cfg, highlightBest })}
              />

              {cfg.discountId ? (
                <InlineStack gap="200" blockAlign="center">
                  <Badge tone="success">Discount active</Badge>
                  <Text as="span" variant="bodySm" tone="subdued">
                    Applied automatically at checkout.
                  </Text>
                </InlineStack>
              ) : null}
            </BlockStack>
          </BlockStack>
        }
      />
    </Page>
  );
}
