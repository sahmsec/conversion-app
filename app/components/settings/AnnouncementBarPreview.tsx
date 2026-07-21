import { Box } from "@shopify/polaris";
import type {
  AnnouncementBarConfig,
  GlobalWidgetSettings,
} from "../../lib/widget-config";

export function AnnouncementBarPreview({
  global,
  config,
}: {
  global: GlobalWidgetSettings;
  config: AnnouncementBarConfig;
}) {
  const first = config.messages.find((m) => m.trim().length > 0) ?? "Your message here";

  const bar = (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        padding: "8px 28px",
        position: "relative",
        background: global.colors.bg,
        color: global.colors.text,
        fontSize: Math.max(11, global.typography.fontSize - 3),
        fontWeight: global.typography.fontWeight,
        textAlign: "center",
      }}
    >
      <span style={{ wordBreak: "break-word" }}>{first}</span>
      {config.countdownTo && (
        <span style={{ opacity: 0.85, whiteSpace: "nowrap" }}>· 02:14:33:10</span>
      )}
      {config.dismissible && (
        <span style={{ position: "absolute", right: 10, top: 8, opacity: 0.7 }}>×</span>
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
