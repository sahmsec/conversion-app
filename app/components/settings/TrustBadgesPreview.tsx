import { Box } from "@shopify/polaris";
import type { TrustBadgesConfig } from "../../lib/widget-config";
import { TRUST_BADGE_META } from "../../lib/trust-badges";

export function TrustBadgesPreview({ config }: { config: TrustBadgesConfig }) {
  const justify =
    config.alignment === "left"
      ? "flex-start"
      : config.alignment === "right"
        ? "flex-end"
        : "center";

  return (
    <Box borderColor="border" borderWidth="025" borderRadius="200" background="bg-surface-secondary">
      <div style={{ padding: 16 }}>
        {config.heading && (
          <div
            style={{
              textAlign: config.alignment,
              fontSize: 13,
              color: "#616161",
              marginBottom: 8,
            }}
          >
            {config.heading}
          </div>
        )}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            justifyContent: justify,
          }}
        >
          {config.badges.map((key) => {
            const meta = TRUST_BADGE_META[key];
            return (
              <span
                key={key}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  height: 28,
                  padding: "0 10px",
                  borderRadius: 6,
                  background: "#ffffff",
                  border: "1px solid #e1e3e5",
                  color: meta.color,
                  fontSize: 12,
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                }}
              >
                {meta.label}
              </span>
            );
          })}
        </div>
      </div>
    </Box>
  );
}
