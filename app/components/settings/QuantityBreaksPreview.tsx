import { Box } from "@shopify/polaris";
import type {
  GlobalWidgetSettings,
  QuantityBreaksConfig,
} from "../../lib/widget-config";

export function QuantityBreaksPreview({
  global,
  config,
}: {
  global: GlobalWidgetSettings;
  config: QuantityBreaksConfig;
}) {
  const tiers = [...config.tiers].sort((a, b) => a.minQuantity - b.minQuantity);
  const bestIdx = config.highlightBest
    ? tiers.reduce((best, t, i) => (t.percent > tiers[best].percent ? i : best), 0)
    : -1;

  return (
    <Box
      borderColor="border"
      borderWidth="025"
      borderRadius="200"
      background="bg-surface-secondary"
    >
      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: "#1f2937" }}>
          {config.heading || "Buy more, save more"}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {tiers.map((t, i) => {
            const highlight = i === bestIdx;
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: `1.5px solid ${highlight ? global.colors.accent : "#e5e7eb"}`,
                  background: highlight ? `${global.colors.accent}12` : "#ffffff",
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: "#1f2937" }}>
                  Buy {t.minQuantity}+
                </span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: highlight ? global.colors.accent : "#374151",
                  }}
                >
                  Save {t.percent}%
                </span>
              </div>
            );
          })}
          {tiers.length === 0 && (
            <div style={{ fontSize: 12, color: "#9ca3af" }}>Add a tier to preview.</div>
          )}
        </div>
      </div>
    </Box>
  );
}
