import type { ReactNode } from "react";
import {
  Banner,
  BlockStack,
  Button,
  Card,
  InlineStack,
  Layout,
  Text,
} from "@shopify/polaris";

export type WidgetFormBanner = {
  tone: "success" | "critical" | "warning";
  content: string;
} | null;

/**
 * Reusable two-column layout for every widget's settings screen:
 * left = enable toggle + settings controls, right = sticky live preview.
 * Presentational only — the route owns state, save, and the fetcher.
 */
export function WidgetSettingsForm({
  description,
  enabled,
  onToggleEnabled,
  onSave,
  saving,
  dirty,
  banner,
  onDismissBanner,
  settings,
  preview,
}: {
  description: string;
  enabled: boolean;
  onToggleEnabled: (next: boolean) => void;
  onSave: () => void;
  saving: boolean;
  dirty: boolean;
  banner: WidgetFormBanner;
  onDismissBanner?: () => void;
  settings: ReactNode;
  preview: ReactNode;
}) {
  return (
    <BlockStack gap="400">
      {banner && (
        <Banner tone={banner.tone} onDismiss={onDismissBanner}>
          {banner.content}
        </Banner>
      )}

      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            {/* Enable + status */}
            <Card>
              <InlineStack align="space-between" blockAlign="center">
                <BlockStack gap="100">
                  <Text as="h2" variant="headingMd">
                    {enabled ? "Widget is on" : "Widget is off"}
                  </Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    {description}
                  </Text>
                </BlockStack>
                <Button
                  variant={enabled ? "secondary" : "primary"}
                  tone={enabled ? "critical" : undefined}
                  onClick={() => onToggleEnabled(!enabled)}
                  loading={saving}
                  disabled={saving}
                >
                  {enabled ? "Turn off" : "Turn on"}
                </Button>
              </InlineStack>
            </Card>

            {/* Settings controls */}
            <Card>
              <BlockStack gap="400">{settings}</BlockStack>
            </Card>

            <InlineStack align="end">
              <Button
                variant="primary"
                onClick={onSave}
                loading={saving}
                disabled={!dirty || saving}
              >
                Save
              </Button>
            </InlineStack>
          </BlockStack>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">
                Live preview
              </Text>
              {preview}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </BlockStack>
  );
}
