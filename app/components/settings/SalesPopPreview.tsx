import { Box } from "@shopify/polaris";
import type {
  GlobalWidgetSettings,
  SalesPopConfig,
} from "../../lib/widget-config";

export function SalesPopPreview({
  global,
  config,
}: {
  global: GlobalWidgetSettings;
  config: SalesPopConfig;
}) {
  const location = config.showLocation ? "Austin, TX" : "your area";
  const text = config.template
    .replace(/\{\{\s*product\s*\}\}/g, "The Minimalist Watch")
    .replace(/\{\{\s*location\s*\}\}/g, location);

  return (
    <Box
      borderColor="border"
      borderWidth="025"
      borderRadius="200"
      background="bg-surface-secondary"
    >
      <div
        style={{
          position: "relative",
          height: 200,
          overflow: "hidden",
          borderRadius: 8,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#9ca3af",
            fontSize: 12,
          }}
        >
          storefront
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 16,
            [config.corner === "right" ? "right" : "left"]: 16,
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            maxWidth: 280,
            padding: "12px 32px 12px 14px",
            background: "#ffffff",
            color: "#1f2937",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            boxShadow: "0 8px 28px rgba(0,0,0,0.16)",
            fontSize: 13,
            lineHeight: 1.35,
          }}
        >
          <span
            style={{
              flex: "0 0 auto",
              width: 8,
              height: 8,
              marginTop: 5,
              borderRadius: "50%",
              background: global.colors.accent,
              boxShadow: `0 0 0 3px ${global.colors.accent}33`,
            }}
          />
          <span>
            <span style={{ fontWeight: 600, display: "block" }}>{text}</span>
            {config.showTimeAgo && (
              <span
                style={{
                  display: "block",
                  marginTop: 3,
                  fontSize: 11,
                  fontWeight: 500,
                  color: "#6b7280",
                }}
              >
                2 minutes ago
              </span>
            )}
          </span>
        </div>
      </div>
    </Box>
  );
}
