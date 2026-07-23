import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import {
  Badge,
  Banner,
  BlockStack,
  Button,
  Card,
  InlineGrid,
  InlineStack,
  Page,
  ProgressBar,
  Text,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";

import { authenticate } from "../shopify.server";
import { listWidgets } from "../models/widget.server";
import { getStats } from "../models/stats.server";
import {
  conversionScore,
  scoreLabel,
  scoreTone,
  storeHealthScore,
} from "../lib/scores";
import { STOREFRONT_KEY, type WidgetType } from "../lib/widget-config";

const WIDGET_META: Record<WidgetType, { name: string; description: string; route: string }> = {
  STICKY_ATC: {
    name: "Sticky Add to Cart",
    description: "Keep the buy button in view as shoppers scroll.",
    route: "/app/widgets/sticky-cart",
  },
  FREE_SHIPPING_BAR: {
    name: "Free Shipping Bar",
    description: "Show progress toward a free-shipping goal.",
    route: "/app/widgets/free-shipping-bar",
  },
  CART_GOAL: {
    name: "Cart Goal",
    description: "Nudge shoppers to spend more for a reward.",
    route: "/app/widgets/cart-goal",
  },
  TRUST_BADGES: {
    name: "Trust Badges",
    description: "Payment, SSL, and money-back icons.",
    route: "/app/widgets/trust-badges",
  },
  ANNOUNCEMENT_BAR: {
    name: "Announcement Bar",
    description: "Rotating announcements and countdowns.",
    route: "/app/widgets/announcement-bar",
  },
  COUNTDOWN: {
    name: "Countdown Timer",
    description: "Urgency timer — to a sale date or a per-visitor countdown.",
    route: "/app/widgets/countdown",
  },
  SALES_POP: {
    name: "Sales Pop",
    description: "Real recent-order social proof — “Someone in Austin just bought…”.",
    route: "/app/widgets/sales-pop",
  },
  QUANTITY_BREAKS: {
    name: "Quantity Breaks",
    description: "Volume discount — buy more, save more (auto-applied at checkout).",
    route: "/app/widgets/quantity-breaks",
  },
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const [widgets, stats] = await Promise.all([
    listWidgets(session.shop),
    getStats(session.shop),
  ]);
  const themeEditorUrl = `https://${session.shop}/admin/themes/current/editor?context=apps`;
  return { widgets, themeEditorUrl, stats };
};

export default function Dashboard() {
  const { widgets, themeEditorUrl, stats } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  const statuses = widgets.map((w) => ({ type: w.type, enabled: w.enabled }));
  const health = storeHealthScore(statuses);
  const conversion = conversionScore(statuses);
  const activeCount = widgets.filter((w) => w.enabled).length;

  return (
    <Page>
      <TitleBar title="Conversion App" />
      <BlockStack gap="500">
        {/* Onboarding — widgets need the theme app embed enabled once */}
        <Banner tone="info" title="Activate widgets on your storefront">
          <BlockStack gap="200">
            <Text as="p" variant="bodyMd">
              Widgets appear on your store only after the Conversion App embed is
              enabled in your theme. Turn it on once — then toggle widgets on and off
              here anytime.
            </Text>
            <InlineStack>
              <Button url={themeEditorUrl} target="_blank" variant="primary">
                Enable in theme editor
              </Button>
            </InlineStack>
          </BlockStack>
        </Banner>

        {/* Scores */}
        <InlineGrid columns={{ xs: 1, sm: 2 }} gap="400">
          <ScoreCard
            title="Store Health Score"
            score={health}
            caption="Overall setup across your conversion widgets."
          />
          <ScoreCard
            title="Conversion Score"
            score={conversion}
            caption="How much of the conversion toolkit is currently active."
          />
        </InlineGrid>

        {/* Widgets */}
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between" blockAlign="center">
              <Text as="h2" variant="headingMd">
                Widgets
              </Text>
              <Text as="span" variant="bodyMd" tone="subdued">
                {activeCount} of {widgets.length} active
              </Text>
            </InlineStack>

            <BlockStack gap="300">
              {widgets.map((w) => {
                const meta = WIDGET_META[w.type];
                return (
                  <Card key={w.type} background="bg-surface-secondary">
                    <InlineStack align="space-between" blockAlign="center" gap="300">
                      <BlockStack gap="100">
                        <InlineStack gap="200" blockAlign="center">
                          <Text as="h3" variant="headingSm">
                            {meta.name}
                          </Text>
                          {w.enabled ? (
                            <Badge tone="success">On</Badge>
                          ) : (
                            <Badge tone="attention">Off</Badge>
                          )}
                        </InlineStack>
                        <Text as="p" variant="bodyMd" tone="subdued">
                          {meta.description}
                        </Text>
                      </BlockStack>
                      <Button
                        variant={w.enabled ? "secondary" : "primary"}
                        onClick={() => navigate(meta.route)}
                      >
                        Manage
                      </Button>
                    </InlineStack>
                  </Card>
                );
              })}
            </BlockStack>
          </BlockStack>
        </Card>

        {/* Analytics */}
        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              Analytics · last 30 days
            </Text>
            <BlockStack gap="200">
              <InlineGrid columns={4} gap="200">
                <Text as="span" variant="bodySm" tone="subdued">
                  Widget
                </Text>
                <Text as="span" variant="bodySm" tone="subdued" alignment="end">
                  Views
                </Text>
                <Text as="span" variant="bodySm" tone="subdued" alignment="end">
                  Clicks
                </Text>
                <Text as="span" variant="bodySm" tone="subdued" alignment="end">
                  Goals
                </Text>
              </InlineGrid>
              {widgets.map((w) => {
                const s = stats[STOREFRONT_KEY[w.type]] || {
                  impression: 0,
                  click: 0,
                  goal: 0,
                };
                return (
                  <InlineGrid key={w.type} columns={4} gap="200">
                    <Text as="span" variant="bodyMd">
                      {WIDGET_META[w.type].name}
                    </Text>
                    <Text as="span" variant="bodyMd" alignment="end">
                      {s.impression.toLocaleString()}
                    </Text>
                    <Text as="span" variant="bodyMd" alignment="end">
                      {s.click ? s.click.toLocaleString() : "—"}
                    </Text>
                    <Text as="span" variant="bodyMd" alignment="end">
                      {s.goal ? s.goal.toLocaleString() : "—"}
                    </Text>
                  </InlineGrid>
                );
              })}
            </BlockStack>
            <Text as="p" variant="bodySm" tone="subdued">
              Views = times shown to shoppers. Clicks and Goals are tracked where they
              apply (sticky-cart clicks; free-shipping / cart-goal reached).
            </Text>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}

function ScoreCard({
  title,
  score,
  caption,
}: {
  title: string;
  score: number;
  caption: string;
}) {
  const tone = scoreTone(score);
  const badgeTone = tone === "success" ? "success" : tone === "warning" ? "warning" : "critical";
  const barTone = tone === "success" ? "success" : tone === "warning" ? "highlight" : "critical";

  return (
    <Card>
      <BlockStack gap="300">
        <InlineStack align="space-between" blockAlign="center">
          <Text as="h2" variant="headingMd">
            {title}
          </Text>
          <Badge tone={badgeTone}>{scoreLabel(score)}</Badge>
        </InlineStack>
        <InlineStack blockAlign="baseline" gap="100">
          <Text as="span" variant="heading2xl">
            {String(score)}
          </Text>
          <Text as="span" variant="bodyLg" tone="subdued">
            / 100
          </Text>
        </InlineStack>
        <ProgressBar progress={score} tone={barTone} size="small" />
        <Text as="p" variant="bodySm" tone="subdued">
          {caption}
        </Text>
      </BlockStack>
    </Card>
  );
}
