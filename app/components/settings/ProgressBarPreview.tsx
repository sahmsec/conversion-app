import { Box } from "@shopify/polaris";
import type { GlobalWidgetSettings } from "../../lib/widget-config";

/** Shared preview for spend-goal bars (Free Shipping Bar + Cart Goal). */
export function ProgressBarPreview({
  global,
  message,
  goalCents,
  showProgressBar,
  reward,
}: {
  global: GlobalWidgetSettings;
  message: string;
  goalCents: number;
  showProgressBar: boolean;
  reward?: string;
}) {
  const sampleRemaining = Math.max(0, Math.round(goalCents / 2));
  const text = fill(message, {
    remaining: "$" + (sampleRemaining / 100).toFixed(2),
    reward: reward ?? "",
  });

  const bar = (
    <div
      style={{
        padding: "10px 16px",
        background: global.colors.bg,
        color: global.colors.text,
        fontSize: Math.max(11, global.typography.fontSize - 3),
        fontWeight: global.typography.fontWeight,
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div>{text}</div>
      {showProgressBar && (
        <div
          style={{
            height: 6,
            background: "rgba(255,255,255,0.25)",
            borderRadius: 999,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: "50%",
              height: "100%",
              background: global.colors.accent,
              borderRadius: 999,
            }}
          />
        </div>
      )}
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

function fill(template: string, tokens: Record<string, string>): string {
  return String(template ?? "").replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) =>
    Object.prototype.hasOwnProperty.call(tokens, k) ? tokens[k] : m,
  );
}
