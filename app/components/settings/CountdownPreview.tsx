import { Box } from "@shopify/polaris";
import type {
  CountdownConfig,
  GlobalWidgetSettings,
} from "../../lib/widget-config";

export function CountdownPreview({
  global,
  config,
}: {
  global: GlobalWidgetSettings;
  config: CountdownConfig;
}) {
  const sample = "02:14:33";
  const text = config.message.includes("{{timer}}")
    ? config.message.replace(/\{\{\s*timer\s*\}\}/g, sample)
    : `${config.message} ${sample}`.trim();

  const bar = (
    <div
      style={{
        padding: "8px 12px",
        background: global.colors.bg,
        color: global.colors.text,
        fontSize: Math.max(11, global.typography.fontSize - 3),
        fontWeight: global.typography.fontWeight,
        textAlign: "center",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {text || "Hurry! Sale ends in 02:14:33"}
    </div>
  );

  return (
    <Box borderColor="border" borderWidth="025" borderRadius="200" background="bg-surface-secondary">
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: global.position === "top" ? "flex-start" : "flex-end",
          height: 200,
          overflow: "hidden",
          borderRadius: 8,
        }}
      >
        {global.position === "top" && bar}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#9ca3af",
            fontSize: 12,
          }}
        >
          storefront
        </div>
        {global.position === "bottom" && bar}
      </div>
    </Box>
  );
}
