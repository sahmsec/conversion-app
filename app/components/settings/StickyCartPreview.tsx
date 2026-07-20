import { Box } from "@shopify/polaris";
import type {
  GlobalWidgetSettings,
  StickyAtcConfig,
} from "../../lib/widget-config";

/**
 * Approximate live preview of the Sticky Add to Cart bar, driven by the same
 * config the storefront widget uses. Not pixel-identical to the theme, but shows
 * colour, typography, position, and which controls are visible.
 */
export function StickyCartPreview({
  global,
  sticky,
}: {
  global: GlobalWidgetSettings;
  sticky: StickyAtcConfig;
}) {
  const bar = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        background: global.colors.bg,
        color: global.colors.text,
        fontSize: Math.max(11, global.typography.fontSize - 3),
        fontWeight: global.typography.fontWeight,
        boxShadow: "0 -1px 6px rgba(0,0,0,0.15)",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          Sample product
        </div>
        <div style={{ opacity: 0.8, fontSize: 11, fontWeight: 400 }}>$29.00</div>
      </div>

      {sticky.showQuantity && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            border: `1px solid ${global.colors.text}`,
            borderRadius: 6,
            opacity: 0.9,
            fontSize: 12,
          }}
        >
          <span style={{ padding: "2px 6px" }}>−</span>
          <span style={{ padding: "2px 6px" }}>1</span>
          <span style={{ padding: "2px 6px" }}>+</span>
        </div>
      )}

      <button
        style={{
          background: global.colors.accent,
          color: "#fff",
          border: "none",
          borderRadius: 6,
          padding: "8px 12px",
          fontWeight: 600,
          fontSize: 12,
          cursor: "default",
          whiteSpace: "nowrap",
        }}
      >
        {sticky.ctaText || "Add to cart"}
      </button>

      {sticky.showBuyNow && (
        <button
          style={{
            background: "transparent",
            color: global.colors.text,
            border: `1px solid ${global.colors.text}`,
            borderRadius: 6,
            padding: "8px 12px",
            fontWeight: 600,
            fontSize: 12,
            cursor: "default",
            whiteSpace: "nowrap",
          }}
        >
          Buy now
        </button>
      )}
    </div>
  );

  return (
    <Box
      borderColor="border"
      borderWidth="025"
      borderRadius="200"
      background="bg-surface-secondary"
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: global.position === "top" ? "flex-start" : "flex-end",
          height: 220,
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
