import type { TrustBadgeKey } from "./widget-config";

/**
 * Display metadata for trust badges (admin preview + selection UI). The storefront
 * widget mirrors this list in `assets/trust-badges.js`. Badges render as clean,
 * lightweight chips; swap for full brand SVGs in a later pass if desired.
 */
export const TRUST_BADGE_META: Record<TrustBadgeKey, { label: string; color: string }> = {
  visa: { label: "VISA", color: "#1a1f71" },
  mastercard: { label: "Mastercard", color: "#eb001b" },
  amex: { label: "AMEX", color: "#2e77bc" },
  paypal: { label: "PayPal", color: "#003087" },
  applepay: { label: "Apple Pay", color: "#000000" },
  googlepay: { label: "Google Pay", color: "#5f6368" },
  ssl: { label: "🔒 SSL Secure", color: "#1f7a3d" },
  moneyback: { label: "↩ Money-back", color: "#7a1f1f" },
};
