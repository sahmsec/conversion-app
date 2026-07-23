import { Box } from "@shopify/polaris";
import type { GlobalWidgetSettings, UpsellConfig } from "../../lib/widget-config";

export function UpsellPreview({
  global,
  config,
}: {
  global: GlobalWidgetSettings;
  config: UpsellConfig;
}) {
  const count = Math.min(config.maxItems, config.layout === "grid" ? 4 : 3);
  const cards = Array.from({ length: count });

  return (
    <Box
      borderColor="border"
      borderWidth="025"
      borderRadius="200"
      background="bg-surface-secondary"
    >
      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, color: "#1f2937" }}>
          {config.heading || "You may also like"}
        </div>
        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: config.layout === "grid" ? "wrap" : "nowrap",
            overflowX: config.layout === "row" ? "auto" : "visible",
          }}
        >
          {cards.map((_, i) => (
            <div
              key={i}
              style={{
                flex: config.layout === "grid" ? "1 1 90px" : "0 0 96px",
                maxWidth: 120,
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                padding: 8,
                background: "#fff",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <div
                style={{
                  width: "100%",
                  aspectRatio: "1 / 1",
                  borderRadius: 6,
                  background: "#eef1f4",
                }}
              />
              <div style={{ height: 8, borderRadius: 4, background: "#e5e7eb" }} />
              <div style={{ fontSize: 11, fontWeight: 700, color: "#374151" }}>$24.00</div>
              <div
                style={{
                  marginTop: 2,
                  textAlign: "center",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#fff",
                  background: global.colors.accent,
                  borderRadius: 6,
                  padding: "5px 0",
                }}
              >
                {config.ctaText || "Add"}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Box>
  );
}
