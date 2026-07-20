/**
 * Widget configuration contract — the single source of truth for the shape of the
 * `config` JSON stored on `WidgetSettings.config`. Used by the settings loader/action,
 * the metafield sync service, and (mirrored in) the storefront runtime.
 *
 * A widget's config is always `{ global, widget }`:
 *   - `global` is identical across every widget (the PRD "Global Settings").
 *   - `widget` is the widget-specific shape, keyed by WidgetType.
 *
 * This module is pure (no Prisma / no React) so it can run anywhere.
 */

export const WIDGET_TYPES = [
  "STICKY_ATC",
  "ANNOUNCEMENT_BAR",
  "FREE_SHIPPING_BAR",
  "TRUST_BADGES",
  "CART_GOAL",
] as const;

export type WidgetType = (typeof WIDGET_TYPES)[number];

/** Stable storefront key for each widget type (used in the metafield payload + JS registry). */
export const STOREFRONT_KEY: Record<WidgetType, string> = {
  STICKY_ATC: "sticky-cart",
  ANNOUNCEMENT_BAR: "announcement-bar",
  FREE_SHIPPING_BAR: "free-shipping-bar",
  TRUST_BADGES: "trust-badges",
  CART_GOAL: "cart-goal",
};

// ---------------------------------------------------------------------------
// Global settings (shared by all widgets)
// ---------------------------------------------------------------------------

export type GlobalWidgetSettings = {
  devices: { desktop: boolean; mobile: boolean };
  colors: { bg: string; text: string; accent: string };
  typography: { fontSize: number; fontWeight: number };
  animation: { type: "none" | "fade" | "slide"; speedMs: number };
  position: "top" | "bottom";
  schedule: { start?: string; end?: string; days: number[] } | null;
};

export const DEFAULT_GLOBAL: GlobalWidgetSettings = {
  devices: { desktop: true, mobile: true },
  colors: { bg: "#111827", text: "#ffffff", accent: "#4f46e5" },
  typography: { fontSize: 16, fontWeight: 600 },
  animation: { type: "fade", speedMs: 200 },
  position: "bottom",
  schedule: null,
};

// ---------------------------------------------------------------------------
// Widget-specific settings
// ---------------------------------------------------------------------------

export type StickyAtcConfig = {
  ctaText: string;
  showQuantity: boolean;
  showBuyNow: boolean;
  showAfterScroll: boolean;
};

const DEFAULT_STICKY_ATC: StickyAtcConfig = {
  ctaText: "Add to cart",
  showQuantity: true,
  showBuyNow: true,
  showAfterScroll: true,
};

export type FreeShippingBarConfig = {
  goalCents: number; // free-shipping threshold in the store's currency (cents)
  messageBefore: string; // supports the {{remaining}} token
  messageAfter: string;
  showProgressBar: boolean;
};

const DEFAULT_FREE_SHIPPING_BAR: FreeShippingBarConfig = {
  goalCents: 5000,
  messageBefore: "Spend {{remaining}} more for FREE shipping!",
  messageAfter: "🎉 You've unlocked FREE shipping!",
  showProgressBar: true,
};

export type CartGoalConfig = {
  goalCents: number;
  reward: string;
  messageBefore: string; // supports {{remaining}} and {{reward}}
  messageAfter: string; // supports {{reward}}
  showProgressBar: boolean;
};

const DEFAULT_CART_GOAL: CartGoalConfig = {
  goalCents: 7500,
  reward: "a free gift",
  messageBefore: "You're {{remaining}} away from {{reward}}!",
  messageAfter: "🎁 You've earned {{reward}}!",
  showProgressBar: true,
};

export const TRUST_BADGE_KEYS = [
  "visa",
  "mastercard",
  "amex",
  "paypal",
  "applepay",
  "googlepay",
  "ssl",
  "moneyback",
] as const;
export type TrustBadgeKey = (typeof TRUST_BADGE_KEYS)[number];

export type TrustBadgesConfig = {
  heading: string;
  badges: TrustBadgeKey[];
  alignment: "left" | "center" | "right";
};

const DEFAULT_TRUST_BADGES: TrustBadgesConfig = {
  heading: "Guaranteed safe & secure checkout",
  badges: ["visa", "mastercard", "amex", "paypal", "applepay"],
  alignment: "center",
};

export type AnnouncementBarConfig = {
  messages: string[];
  rotateMs: number;
  link: string;
  dismissible: boolean;
  countdownTo: string | null; // ISO date; optional countdown
};

const DEFAULT_ANNOUNCEMENT_BAR: AnnouncementBarConfig = {
  messages: ["Welcome to our store!"],
  rotateMs: 4000,
  link: "",
  dismissible: false,
  countdownTo: null,
};

/** Widget-specific defaults keyed by type. */
export const DEFAULT_WIDGET: Record<WidgetType, Record<string, unknown>> = {
  STICKY_ATC: { ...DEFAULT_STICKY_ATC },
  ANNOUNCEMENT_BAR: { ...DEFAULT_ANNOUNCEMENT_BAR },
  FREE_SHIPPING_BAR: { ...DEFAULT_FREE_SHIPPING_BAR },
  TRUST_BADGES: { ...DEFAULT_TRUST_BADGES },
  CART_GOAL: { ...DEFAULT_CART_GOAL },
};

export type WidgetConfig = {
  global: GlobalWidgetSettings;
  widget: Record<string, unknown>;
};

export type StickyAtcWidgetConfig = {
  global: GlobalWidgetSettings;
  widget: StickyAtcConfig;
};

// ---------------------------------------------------------------------------
// Normalization — never throws; always returns a valid, fully-populated config.
// ---------------------------------------------------------------------------

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function bool(v: unknown, d: boolean): boolean {
  return typeof v === "boolean" ? v : d;
}
function str(v: unknown, d: string): string {
  return typeof v === "string" && v.length > 0 ? v : d;
}
function hex(v: unknown, d: string): string {
  return typeof v === "string" && HEX.test(v) ? v : d;
}
function clampInt(v: unknown, min: number, max: number, d: number): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return d;
  return Math.min(max, Math.max(min, Math.round(n)));
}
function oneOf<T extends string>(v: unknown, allowed: readonly T[], d: T): T {
  return typeof v === "string" && (allowed as readonly string[]).includes(v)
    ? (v as T)
    : d;
}
function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
}

export function normalizeGlobal(raw: unknown): GlobalWidgetSettings {
  const r = obj(raw);
  const devices = obj(r.devices);
  const colors = obj(r.colors);
  const typography = obj(r.typography);
  const animation = obj(r.animation);

  let schedule: GlobalWidgetSettings["schedule"] = null;
  if (r.schedule && typeof r.schedule === "object") {
    const s = obj(r.schedule);
    const days = Array.isArray(s.days)
      ? s.days.filter((d) => typeof d === "number" && d >= 0 && d <= 6)
      : [0, 1, 2, 3, 4, 5, 6];
    schedule = {
      start: typeof s.start === "string" ? s.start : undefined,
      end: typeof s.end === "string" ? s.end : undefined,
      days: days as number[],
    };
  }

  return {
    devices: {
      desktop: bool(devices.desktop, DEFAULT_GLOBAL.devices.desktop),
      mobile: bool(devices.mobile, DEFAULT_GLOBAL.devices.mobile),
    },
    colors: {
      bg: hex(colors.bg, DEFAULT_GLOBAL.colors.bg),
      text: hex(colors.text, DEFAULT_GLOBAL.colors.text),
      accent: hex(colors.accent, DEFAULT_GLOBAL.colors.accent),
    },
    typography: {
      fontSize: clampInt(typography.fontSize, 10, 32, DEFAULT_GLOBAL.typography.fontSize),
      fontWeight: clampInt(typography.fontWeight, 300, 900, DEFAULT_GLOBAL.typography.fontWeight),
    },
    animation: {
      type: oneOf(animation.type, ["none", "fade", "slide"] as const, DEFAULT_GLOBAL.animation.type),
      speedMs: clampInt(animation.speedMs, 0, 2000, DEFAULT_GLOBAL.animation.speedMs),
    },
    position: oneOf(r.position, ["top", "bottom"] as const, DEFAULT_GLOBAL.position),
    schedule,
  };
}

/** Normalize an array of non-empty strings; returns a copy of `d` if none valid. */
function strArray(v: unknown, d: string[]): string[] {
  if (!Array.isArray(v)) return d.slice();
  const out = v.filter(
    (x): x is string => typeof x === "string" && x.trim().length > 0,
  );
  return out.length > 0 ? out : d.slice();
}

function normalizeStickyAtc(raw: unknown): StickyAtcConfig {
  const r = obj(raw);
  return {
    ctaText: str(r.ctaText, DEFAULT_STICKY_ATC.ctaText),
    showQuantity: bool(r.showQuantity, DEFAULT_STICKY_ATC.showQuantity),
    showBuyNow: bool(r.showBuyNow, DEFAULT_STICKY_ATC.showBuyNow),
    showAfterScroll: bool(r.showAfterScroll, DEFAULT_STICKY_ATC.showAfterScroll),
  };
}

function normalizeFreeShippingBar(raw: unknown): FreeShippingBarConfig {
  const r = obj(raw);
  return {
    goalCents: clampInt(r.goalCents, 0, 100000000, DEFAULT_FREE_SHIPPING_BAR.goalCents),
    messageBefore: str(r.messageBefore, DEFAULT_FREE_SHIPPING_BAR.messageBefore),
    messageAfter: str(r.messageAfter, DEFAULT_FREE_SHIPPING_BAR.messageAfter),
    showProgressBar: bool(r.showProgressBar, DEFAULT_FREE_SHIPPING_BAR.showProgressBar),
  };
}

function normalizeCartGoal(raw: unknown): CartGoalConfig {
  const r = obj(raw);
  return {
    goalCents: clampInt(r.goalCents, 0, 100000000, DEFAULT_CART_GOAL.goalCents),
    reward: str(r.reward, DEFAULT_CART_GOAL.reward),
    messageBefore: str(r.messageBefore, DEFAULT_CART_GOAL.messageBefore),
    messageAfter: str(r.messageAfter, DEFAULT_CART_GOAL.messageAfter),
    showProgressBar: bool(r.showProgressBar, DEFAULT_CART_GOAL.showProgressBar),
  };
}

function normalizeTrustBadges(raw: unknown): TrustBadgesConfig {
  const r = obj(raw);
  const badges = strArray(r.badges, DEFAULT_TRUST_BADGES.badges).filter(
    (b): b is TrustBadgeKey => (TRUST_BADGE_KEYS as readonly string[]).includes(b),
  );
  return {
    heading: str(r.heading, DEFAULT_TRUST_BADGES.heading),
    badges: badges.length > 0 ? badges : DEFAULT_TRUST_BADGES.badges.slice(),
    alignment: oneOf(
      r.alignment,
      ["left", "center", "right"] as const,
      DEFAULT_TRUST_BADGES.alignment,
    ),
  };
}

function normalizeAnnouncementBar(raw: unknown): AnnouncementBarConfig {
  const r = obj(raw);
  return {
    messages: strArray(r.messages, DEFAULT_ANNOUNCEMENT_BAR.messages),
    rotateMs: clampInt(r.rotateMs, 1000, 60000, DEFAULT_ANNOUNCEMENT_BAR.rotateMs),
    link: typeof r.link === "string" ? r.link : DEFAULT_ANNOUNCEMENT_BAR.link,
    dismissible: bool(r.dismissible, DEFAULT_ANNOUNCEMENT_BAR.dismissible),
    countdownTo:
      typeof r.countdownTo === "string" && r.countdownTo.length > 0
        ? r.countdownTo
        : null,
  };
}

const WIDGET_NORMALIZERS: Partial<Record<WidgetType, (raw: unknown) => Record<string, unknown>>> = {
  STICKY_ATC: normalizeStickyAtc,
  FREE_SHIPPING_BAR: normalizeFreeShippingBar,
  CART_GOAL: normalizeCartGoal,
  TRUST_BADGES: normalizeTrustBadges,
  ANNOUNCEMENT_BAR: normalizeAnnouncementBar,
};

/** Normalize a stored/submitted config for a widget type into a valid `{ global, widget }`. */
export function normalizeConfig(type: WidgetType, raw: unknown): WidgetConfig {
  const r = obj(raw);
  const normalizeWidget = WIDGET_NORMALIZERS[type];
  return {
    global: normalizeGlobal(r.global),
    widget: normalizeWidget
      ? normalizeWidget(r.widget)
      : { ...DEFAULT_WIDGET[type] },
  };
}

/** The default config for a widget type (used when no row exists yet). */
export function defaultConfig(type: WidgetType): WidgetConfig {
  return {
    global: { ...DEFAULT_GLOBAL },
    widget: { ...DEFAULT_WIDGET[type] },
  };
}

// ---------------------------------------------------------------------------
// Storefront payload — compact JSON written to the shop metafield.
// ---------------------------------------------------------------------------

export type StorefrontConfig = {
  v: 1;
  widgets: Record<string, { global: GlobalWidgetSettings } & Record<string, unknown>>;
};

/**
 * Build the compact storefront payload from the shop's ENABLED widget rows.
 * Only enabled widgets are included; each is keyed by its storefront key.
 */
export function buildStorefrontConfig(
  rows: Array<{ type: WidgetType; enabled: boolean; config: unknown }>,
): StorefrontConfig {
  const widgets: StorefrontConfig["widgets"] = {};
  for (const row of rows) {
    if (!row.enabled) continue;
    const cfg = normalizeConfig(row.type, row.config);
    widgets[STOREFRONT_KEY[row.type]] = { global: cfg.global, ...cfg.widget };
  }
  return { v: 1, widgets };
}
