# Searchaly Boost — Design Spec (v0.1)

**Date:** 2026-07-21
**Status:** Approved (user delegated remaining decisions; build authorized)
**Source PRD:** Searchaly Boost PRD v0.1

## 1. Purpose & Scope

Searchaly Boost is a lightweight all-in-one Shopify conversion-optimization app that
replaces several single-purpose apps (sticky cart, shipping bar, trust badges,
announcement bar, cart goal) with one fast, one-dashboard app.

**This spec covers the first build increment only:**

1. The **app foundation** — auth, database, the shared "settings framework," the
   config-sync bridge, the Theme App Extension harness, and a dashboard shell.
2. **One complete vertical slice** — the **Sticky Add to Cart** widget (the hero
   feature), built end to end: admin settings UI → Postgres → metafield sync →
   storefront rendering.

Widgets 2–5 (Free Shipping Bar, Trust Badges, Announcement Bar, Cart Goal) are
**explicitly out of scope** for this increment. They each get their own spec →
plan → build cycle, reusing the framework proven here.

**Non-goals (this increment):** billing, analytics, AI, Store Health / Conversion
Score formulas, v1.5+ widgets. The dashboard shows placeholders for future scores.

## 2. Guiding Principles (from PRD)

1. Performance over feature count — storefront makes **zero** backend calls at runtime.
2. Reusable components — one shared settings framework (admin) + one shared runtime
   (storefront); adding a widget is mostly config + a small behavior file.
3. Online Store 2.0 compatibility — delivered via Theme App Extension app-embed block.
4. Onboarding under 2 minutes — enable + configure a widget from one dashboard.
5. Scalable code for future AI modules — Postgres is the source of truth for all config.

## 3. Architecture

Two independently-understandable runtimes joined by one sync step.

```
ADMIN APP (Remix, embedded)            STOREFRONT (Theme App Extension)
Polaris + App Bridge                   app-embed block, vanilla JS
  edit settings                          reads shop metafield config (Liquid)
     |                                    injects JSON into <script>, renders
     v                                          ^
  Prisma -> Postgres (Neon)  --- on save --->   | 0 runtime backend calls
  metafield-sync.server (Admin GraphQL           |
  metafieldsSet -> shop.metafields.searchaly) ---'
```

- **Source of truth:** Postgres (`WidgetSettings` table).
- **Bridge:** on every save, the admin writes Postgres, then pushes a compact JSON
  blob to a shop-level app-owned metafield via Admin GraphQL `metafieldsSet`.
- **Storefront read:** the app-embed Liquid reads the metafield and injects it into
  the page as JSON; the widget JS parses and renders. No server round-trip.

### Stack
- Remix 2.16 + React 18 + Shopify Polaris 12 + App Bridge (official template).
- `@shopify/shopify-app-remix` 4.1, Admin API version `2025-01` (January25).
- Prisma 6 → **PostgreSQL (Neon free tier)**.
- Theme App Extension (app-embed block + `assets/*.js`).

## 4. Data Model

Template ships a `Session` model (unchanged). We add one table.

```prisma
enum WidgetType {
  STICKY_ATC
  ANNOUNCEMENT_BAR
  FREE_SHIPPING_BAR
  TRUST_BADGES
  CART_GOAL
}

model WidgetSettings {
  id        String     @id @default(cuid())
  shop      String
  type      WidgetType
  enabled   Boolean    @default(false)
  config    Json       // { global: {...}, widget: {...} }
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt

  @@unique([shop, type])
  @@index([shop])
}
```

`enabled`/`type`/`shop` are columns (queried by the dashboard + sync). All visual
and behavioral configuration lives in the typed `config` JSON so new widgets never
require a migration.

## 5. Shared Settings Framework

The `config` JSON is `{ global, widget }`. `global` is identical for all widgets and
maps 1:1 to the PRD "Global Settings For Every Widget".

```ts
type GlobalWidgetSettings = {
  devices:    { desktop: boolean; mobile: boolean };
  colors:     { bg: string; text: string; accent: string };
  typography: { fontSize: number; fontWeight: number };
  animation:  { type: "none" | "fade" | "slide"; speedMs: number };
  position:   "top" | "bottom";
  schedule:   { start?: string; end?: string; days: number[] } | null;
};

type StickyAtcConfig = {
  ctaText: string;          // "Add to cart"
  showQuantity: boolean;
  showBuyNow: boolean;
  showAfterScroll: boolean; // appear only after native ATC scrolls out of view
};
```

Two reusable spines implement it:

- **Admin (`app/components/settings/`)** — one Polaris component per global group
  (`EnableToggle`, `DeviceVisibility`, `ColorSettings`, `TypographySettings`,
  `AnimationSettings`, `PositionSettings`, `ScheduleSettings`), composed by a
  `WidgetSettingsForm` wrapper with a live preview + Remix save action. A new
  widget = shared groups + its widget-specific fields.
- **Storefront (`extensions/.../assets/core.js`)** — the shared runtime every widget
  uses: parse injected config, evaluate device visibility (`matchMedia`), evaluate
  scheduling, apply global styling as CSS custom properties, and expose a registry
  (`Searchaly.register(type, initFn)`) so each widget ships only its behavior.

Validation: a single Zod-free hand-written validator/normalizer in
`app/lib/widget-config.ts` produces defaults + typed shapes shared by loader, action,
and sync (single source of truth for the config contract).

## 6. Sticky Add to Cart — Behavior

**Admin screen (`/app/widgets/sticky-cart`):** shared global groups + Sticky fields
(CTA text, quantity selector on/off, Buy Now on/off, show-after-scroll on/off) + live
preview. Save persists to Postgres and triggers metafield sync.

**Storefront (`assets/sticky-cart.js`, registered with core):**
- Renders a fixed bar (top/bottom per `position`) with product title, price,
  optional quantity stepper, CTA button, optional Buy Now.
- Reads variant + quantity from the product form on the page; mirrors variant/price
  changes. Falls back gracefully off product pages (renders nothing).
- If `showAfterScroll`, uses `IntersectionObserver` on the theme's native ATC button
  and only shows the sticky bar once that button leaves the viewport.
- CTA → `POST /cart/add.js` (AJAX); Buy Now → `/cart/{variant}:{qty}` checkout path.
- Respects device visibility + schedule from `core.js`. Fails safe: any missing
  config → render nothing (never breaks the storefront).

## 7. Data Flow (save → storefront)

1. Merchant edits + saves in Polaris form → Remix `action`.
2. Action validates via `widget-config.ts`, upserts `WidgetSettings` (Postgres).
3. Action calls `metafield-sync.server.ts` → Admin GraphQL `metafieldsSet` writing a
   compact JSON of all enabled widgets to the app-owned shop metafield.
4. App-embed Liquid reads that metafield, injects `<script type="application/json">`.
5. `core.js` parses config, applies global rules, dispatches to registered widgets.

Exact metafield namespace/access, scopes, and mutation shape are fixed per the
Shopify research note (see Appendix) and encoded in `metafield-sync.server.ts`.

## 8. Error Handling

- **Sync failure** never blocks the DB save: the save succeeds, and the UI shows a
  Polaris banner ("Saved, but publishing to storefront failed — retry"). A manual
  "Re-publish" action re-runs the sync.
- **Config drift / missing metafield** on storefront → widgets render nothing.
- **Invalid stored config** → normalizer fills defaults; never throws to the merchant.
- **Off product page / missing theme selectors** → Sticky ATC no-ops silently.

## 9. Testing

- **Vitest** unit tests for `widget-config.ts` (defaults, normalization, invalid input)
  and the metafield JSON serialization in `metafield-sync.server.ts` (mocked admin
  GraphQL client — assert mutation + variables).
- Manual storefront verification via `shopify app dev` on a development store
  (automated storefront E2E deferred to a later increment).

## 10. Project Structure

```
app/
  routes/
    app._index.tsx              # Dashboard (status grid, quick-enable, score placeholders)
    app.widgets.sticky-cart.tsx # Sticky ATC settings (loader + action)
  lib/widget-config.ts          # config contract: types, defaults, normalizer
  models/widget.server.ts       # Prisma access (get/upsert/list)
  services/metafield-sync.server.ts  # Prisma -> Admin metafieldsSet
  components/settings/*          # reusable Polaris setting groups + WidgetSettingsForm
extensions/searchaly-widgets/
  shopify.extension.toml
  blocks/app-embed.liquid        # reads metafield, injects config JSON
  assets/core.js                 # shared runtime + registry
  assets/sticky-cart.js          # Sticky ATC behavior
  assets/searchaly.css           # base widget styles (CSS-var driven)
prisma/schema.prisma             # + WidgetSettings / WidgetType (Postgres)
docs/superpowers/specs/          # this spec
```

## 11. Hosting / Testing Plan

- **Now (free):** `shopify app dev` (local server + Cloudflare tunnel + dev store).
  Postgres via **Neon free tier** (`DATABASE_URL` in `.env`).
- **Later (free tiers):** Render/Fly.io for the Remix server + Neon for Postgres.
  Storefront is unaffected by host cold-starts (config lives in the metafield).

## 12. Roadmap After This Increment

Each reuses the framework: **Free Shipping Bar → Cart Goal** (share a spend-goal
engine) → **Trust Badges → Announcement Bar** (v1.0 complete). Then v1.5 social-proof
widgets, v2.0 revenue widgets, v3.0 AI + real Store Health / Conversion Score.

## Appendix — Shopify integration facts

Metafield namespace/access, `metafieldsSet` shape, required OAuth scopes, and the
app-embed block schema are pinned to the findings of the Shopify docs research note
gathered during this build and reflected in the corresponding source files.
