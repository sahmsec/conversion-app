import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import {
  Badge,
  BlockStack,
  Button,
  Card,
  InlineGrid,
  InlineStack,
  Page,
  Text,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";

import { authenticate } from "../shopify.server";
import { listWidgets } from "../models/widget.server";
import type { WidgetType } from "../lib/widget-config";

const WIDGET_META: Record<
  WidgetType,
  { name: string; description: string; route?: string }
> = {
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
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const widgets = await listWidgets(session.shop);
  return { widgets };
};

export default function Dashboard() {
  const { widgets } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  // Available widgets first (those with a settings route), then "coming soon".
  const sorted = [...widgets].sort((a, b) => {
    const aAvail = WIDGET_META[a.type].route ? 0 : 1;
    const bAvail = WIDGET_META[b.type].route ? 0 : 1;
    return aAvail - bAvail;
  });

  const activeCount = widgets.filter((w) => w.enabled).length;

  return (
    <Page>
      <TitleBar title="Searchaly Boost" />
      <BlockStack gap="500">
        {/* Scores (placeholders until v3.0 analytics) */}
        <InlineGrid columns={{ xs: 1, sm: 2 }} gap="400">
          <ScoreCard
            title="Store Health Score"
            subtitle="Available in a future update"
          />
          <ScoreCard
            title="Conversion Score"
            subtitle="Available in a future update"
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
                {activeCount} active
              </Text>
            </InlineStack>

            <BlockStack gap="300">
              {sorted.map((w) => {
                const meta = WIDGET_META[w.type];
                const available = Boolean(meta.route);
                return (
                  <Card key={w.type} background="bg-surface-secondary">
                    <InlineStack align="space-between" blockAlign="center" gap="300">
                      <BlockStack gap="100">
                        <InlineStack gap="200" blockAlign="center">
                          <Text as="h3" variant="headingSm">
                            {meta.name}
                          </Text>
                          {!available ? (
                            <Badge>Coming soon</Badge>
                          ) : w.enabled ? (
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
                        disabled={!available}
                        variant={available && !w.enabled ? "primary" : "secondary"}
                        onClick={() => meta.route && navigate(meta.route)}
                      >
                        {available ? "Manage" : "Soon"}
                      </Button>
                    </InlineStack>
                  </Card>
                );
              })}
            </BlockStack>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}

function ScoreCard({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <Card>
      <BlockStack gap="200">
        <Text as="h2" variant="headingMd">
          {title}
        </Text>
        <Text as="span" variant="heading2xl">
          —
        </Text>
        <Text as="p" variant="bodyMd" tone="subdued">
          {subtitle}
        </Text>
      </BlockStack>
    </Card>
  );
}
