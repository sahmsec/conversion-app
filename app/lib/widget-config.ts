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
  "COUNTDOWN",
  "SALES_POP",
  "QUANTITY_BREAKS",
  "UPSELL",
] as const;

export type WidgetType = (typeof WIDGET_TYPES)[number];

/** Stable storefront key for each widget type (used in the metafield payload + JS registry). */
export const STOREFRONT_KEY: Record<WidgetType, string> = {
  STICKY_ATC: "sticky-cart",
  ANNOUNCEMENT_BAR: "announcement-bar",
  FREE_SHIPPING_BAR: "free-shipping-bar",
  TRUST_BADGES: "trust-badges",
  CART_GOAL: "cart-goal",
  COUNTDOWN: "countdown",
  SALES_POP: "sales-pop",
  QUANTITY_BREAKS: "quantity-breaks",
  UPSELL: "upsell",
};

// ---------------------------------------------------------------------------
// Global settings (shared by all widgets)
// ---------------------------------------------------------------------------

/** Where a widget is allowed to show (display rules). */
export type Targeting = {
  pages: "all" | "home" | "product" | "collection" | "cart";
  productHandles: string[]; // when on product pages, limit to these (empty = all)
  collectionHandles: string[]; // when on collection pages, limit to these (empty = all)
  countries: string[]; // ISO country codes; empty = all countries
};

export const DEFAULT_TARGETING: Targeting = {
  pages: "all",
  productHandles: [],
  collectionHandles: [],
  countries: [],
};

/** Form-factor + shape controls shared by the bar-style widgets. */
export type WidgetStyle = {
  formFactor: "bar" | "pill" | "boxed"; // full-width edge bar · floating rounded pill · centered card
  radius: number; // corner radius (px) for pill/boxed
  maxWidth: number; // max width (px) for pill/boxed; 0 = full width
  icon: string; // optional leading emoji/icon (e.g. "🚚")
};

export const DEFAULT_STYLE: WidgetStyle = {
  formFactor: "bar",
  radius: 10,
  maxWidth: 640,
  icon: "",
};

export type GlobalWidgetSettings = {
  devices: { desktop: boolean; mobile: boolean };
  colors: { bg: string; text: string; accent: string };
  typography: { fontSize: number; fontWeight: number };
  animation: { type: "none" | "fade" | "slide"; speedMs: number };
  position: "top" | "bottom";
  style: WidgetStyle;
  dismissible: boolean; // show a ✕ so shoppers can close the widget (remembered per session)
  customCss: string; // raw CSS injected for this widget (merchant's own store)
  schedule: { start?: string; end?: string; days: number[] } | null;
  targeting: Targeting;
};

export const DEFAULT_GLOBAL: GlobalWidgetSettings = {
  devices: { desktop: true, mobile: true },
  colors: { bg: "#111827", text: "#ffffff", accent: "#4f46e5" },
  typography: { fontSize: 16, fontWeight: 600 },
  animation: { type: "fade", speedMs: 200 },
  position: "bottom",
  style: { ...DEFAULT_STYLE },
  dismissible: false,
  customCss: "",
  schedule: null,
  targeting: { pages: "all", productHandles: [], collectionHandles: [], countries: [] },
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

export type CountdownConfig = {
  mode: "fixed" | "evergreen";
  endAt: string | null; // fixed mode: ISO datetime
  durationMinutes: number; // evergreen mode: per-visitor length
  message: string; // supports the {{timer}} token
  expiredMessage: string;
  hideOnExpire: boolean;
};

const DEFAULT_COUNTDOWN: CountdownConfig = {
  mode: "fixed",
  endAt: null,
  durationMinutes: 60,
  message: "Hurry! Sale ends in {{timer}}",
  expiredMessage: "This offer has ended",
  hideOnExpire: false,
};

export type SalesPopConfig = {
  corner: "left" | "right"; // which bottom corner the popup sits in
  intervalSeconds: number; // gap between pops
  durationSeconds: number; // how long each pop stays on screen
  maxPerSession: number; // cap pops shown per pageview (0 = unlimited)
  showLocation: boolean; // include the buyer's city/region (no names — privacy-safe)
  showTimeAgo: boolean; // include a relative "2 hours ago"
  template: string; // supports {{product}} and {{location}}
};

const DEFAULT_SALES_POP: SalesPopConfig = {
  corner: "left",
  intervalSeconds: 8,
  durationSeconds: 5,
  maxPerSession: 8,
  showLocation: true,
  showTimeAgo: true,
  template: "Someone in {{location}} purchased {{product}}",
};

export type QuantityBreakTier = { minQuantity: number; percent: number };

export type QuantityBreaksConfig = {
  heading: string;
  tiers: QuantityBreakTier[]; // minQuantity -> percent off (enforced at checkout by the discount function)
  variantIds: string[]; // optional scoping to specific variant GIDs; empty = all products
  highlightBest: boolean; // storefront table: emphasize the biggest saving
  discountId: string; // internal — the managed automatic-discount GID (not user-facing)
};

const DEFAULT_QUANTITY_BREAKS: QuantityBreaksConfig = {
  heading: "Buy more, save more",
  tiers: [
    { minQuantity: 2, percent: 10 },
    { minQuantity: 4, percent: 15 },
    { minQuantity: 6, percent: 20 },
  ],
  variantIds: [],
  highlightBest: true,
  discountId: "",
};

export type UpsellConfig = {
  heading: string;
  intent: "related" | "complementary"; // related = "you may also like"; complementary = "frequently bought together"
  maxItems: number;
  layout: "row" | "grid";
  ctaText: string;
};

const DEFAULT_UPSELL: UpsellConfig = {
  heading: "You may also like",
  intent: "related",
  maxItems: 4,
  layout: "row",
  ctaText: "Add",
};

/** Widget-specific defaults keyed by type. */
export const DEFAULT_WIDGET: Record<WidgetType, Record<string, unknown>> = {
  STICKY_ATC: { ...DEFAULT_STICKY_ATC },
  ANNOUNCEMENT_BAR: { ...DEFAULT_ANNOUNCEMENT_BAR },
  FREE_SHIPPING_BAR: { ...DEFAULT_FREE_SHIPPING_BAR },
  TRUST_BADGES: { ...DEFAULT_TRUST_BADGES },
  CART_GOAL: { ...DEFAULT_CART_GOAL },
  COUNTDOWN: { ...DEFAULT_COUNTDOWN },
  SALES_POP: { ...DEFAULT_SALES_POP },
  QUANTITY_BREAKS: { ...DEFAULT_QUANTITY_BREAKS },
  UPSELL: { ...DEFAULT_UPSELL },
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
    style: normalizeStyle(r.style),
    dismissible: bool(r.dismissible, DEFAULT_GLOBAL.dismissible),
    customCss: typeof r.customCss === "string" ? r.customCss.slice(0, 5000) : DEFAULT_GLOBAL.customCss,
    schedule,
    targeting: normalizeTargeting(r.targeting),
  };
}

function normalizeStyle(raw: unknown): WidgetStyle {
  const r = obj(raw);
  return {
    formFactor: oneOf(r.formFactor, ["bar", "pill", "boxed"] as const, DEFAULT_STYLE.formFactor),
    radius: clampInt(r.radius, 0, 40, DEFAULT_STYLE.radius),
    maxWidth: clampInt(r.maxWidth, 0, 2000, DEFAULT_STYLE.maxWidth),
    icon: typeof r.icon === "string" ? r.icon.slice(0, 8) : DEFAULT_STYLE.icon,
  };
}

function normalizeTargeting(raw: unknown): Targeting {
  const r = obj(raw);
  return {
    pages: oneOf(
      r.pages,
      ["all", "home", "product", "collection", "cart"] as const,
      DEFAULT_TARGETING.pages,
    ),
    productHandles: handleArray(r.productHandles),
    collectionHandles: handleArray(r.collectionHandles),
    countries: handleArray(r.countries).map((c) => c.toUpperCase()),
  };
}

function handleArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .map((s) => s.trim());
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

function normalizeCountdown(raw: unknown): CountdownConfig {
  const r = obj(raw);
  return {
    mode: oneOf(r.mode, ["fixed", "evergreen"] as const, DEFAULT_COUNTDOWN.mode),
    endAt: typeof r.endAt === "string" && r.endAt.length > 0 ? r.endAt : null,
    durationMinutes: clampInt(r.durationMinutes, 1, 100000, DEFAULT_COUNTDOWN.durationMinutes),
    message: str(r.message, DEFAULT_COUNTDOWN.message),
    expiredMessage: str(r.expiredMessage, DEFAULT_COUNTDOWN.expiredMessage),
    hideOnExpire: bool(r.hideOnExpire, DEFAULT_COUNTDOWN.hideOnExpire),
  };
}

function normalizeQuantityBreaks(raw: unknown): QuantityBreaksConfig {
  const r = obj(raw);
  const tiers = Array.isArray(r.tiers)
    ? r.tiers
        .map((t) => {
          const o = obj(t);
          return {
            minQuantity: clampInt(o.minQuantity, 1, 1000, 2),
            percent: clampInt(o.percent, 1, 100, 10),
          };
        })
        .filter((t) => t.minQuantity > 0 && t.percent > 0)
        .slice(0, 10)
    : DEFAULT_QUANTITY_BREAKS.tiers.map((t) => ({ ...t }));
  return {
    heading: str(r.heading, DEFAULT_QUANTITY_BREAKS.heading),
    tiers,
    variantIds: handleArray(r.variantIds),
    highlightBest: bool(r.highlightBest, DEFAULT_QUANTITY_BREAKS.highlightBest),
    discountId: typeof r.discountId === "string" ? r.discountId : "",
  };
}

function normalizeUpsell(raw: unknown): UpsellConfig {
  const r = obj(raw);
  return {
    heading: str(r.heading, DEFAULT_UPSELL.heading),
    intent: oneOf(r.intent, ["related", "complementary"] as const, DEFAULT_UPSELL.intent),
    maxItems: clampInt(r.maxItems, 1, 10, DEFAULT_UPSELL.maxItems),
    layout: oneOf(r.layout, ["row", "grid"] as const, DEFAULT_UPSELL.layout),
    ctaText: str(r.ctaText, DEFAULT_UPSELL.ctaText),
  };
}

function normalizeSalesPop(raw: unknown): SalesPopConfig {
  const r = obj(raw);
  return {
    corner: oneOf(r.corner, ["left", "right"] as const, DEFAULT_SALES_POP.corner),
    intervalSeconds: clampInt(r.intervalSeconds, 3, 120, DEFAULT_SALES_POP.intervalSeconds),
    durationSeconds: clampInt(r.durationSeconds, 2, 30, DEFAULT_SALES_POP.durationSeconds),
    maxPerSession: clampInt(r.maxPerSession, 0, 100, DEFAULT_SALES_POP.maxPerSession),
    showLocation: bool(r.showLocation, DEFAULT_SALES_POP.showLocation),
    showTimeAgo: bool(r.showTimeAgo, DEFAULT_SALES_POP.showTimeAgo),
    template: str(r.template, DEFAULT_SALES_POP.template),
  };
}

const WIDGET_NORMALIZERS: Partial<Record<WidgetType, (raw: unknown) => Record<string, unknown>>> = {
  STICKY_ATC: normalizeStickyAtc,
  FREE_SHIPPING_BAR: normalizeFreeShippingBar,
  CART_GOAL: normalizeCartGoal,
  TRUST_BADGES: normalizeTrustBadges,
  ANNOUNCEMENT_BAR: normalizeAnnouncementBar,
  COUNTDOWN: normalizeCountdown,
  SALES_POP: normalizeSalesPop,
  QUANTITY_BREAKS: normalizeQuantityBreaks,
  UPSELL: normalizeUpsell,
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
  tz?: string; // store IANA timezone, added by the sync service for scheduling
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
