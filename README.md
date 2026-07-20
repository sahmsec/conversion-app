# Searchaly Boost

A lightweight, all-in-one **Shopify conversion-optimization app**. One dashboard,
many widgets, replacing several single-purpose apps. Built on Shopify's Remix app
template (Polaris + App Bridge + Prisma) with a Theme App Extension for the storefront.

> **Status:** **v1.0 complete** — the app foundation plus all five conversion widgets
> built end to end: **Sticky Add to Cart, Free Shipping Bar, Cart Goal, Trust Badges,
> Announcement Bar**. Each has an admin settings screen (shared global settings + a live
> preview), Postgres persistence, metafield sync, and a storefront implementation.
> See [`docs/superpowers/specs`](docs/superpowers/specs).

## How it works (architecture)

Two runtimes, joined by one sync step — the storefront makes **zero** backend calls
at runtime, which keeps it fast and free-host-friendly.

```
ADMIN APP (Remix, embedded)              STOREFRONT (Theme App Extension)
Polaris settings + dashboard             app-embed block, vanilla JS
   │ save                                  reads shop metafield in Liquid
   ▼                                       injects JSON, renders widgets
Prisma → Postgres (source of truth)              ▲
   │  metafieldsSet (Admin GraphQL)               │  0 runtime backend calls
   └──► shop metafield  $app:searchaly.config ────┘
```

- **Source of truth:** Postgres (`WidgetSettings` table).
- **Bridge:** on save, the app writes Postgres and pushes a compact JSON blob to the
  app-owned shop metafield `$app:searchaly.config`.
- **Read:** the app-embed Liquid reads that metafield
  (`{{ shop.metafields["$app:searchaly"].config.value | json }}`) and hands it to the
  storefront runtime. No app server hit per pageview.

## Project structure

```
app/
  routes/
    app._index.tsx                    Dashboard (widget status grid + score placeholders)
    app.widgets.sticky-cart.tsx       ┐
    app.widgets.free-shipping-bar.tsx │ one settings screen per widget
    app.widgets.cart-goal.tsx         │ (loader/action via widget-route.server)
    app.widgets.trust-badges.tsx      │
    app.widgets.announcement-bar.tsx  ┘
  lib/widget-config.ts                Config contract: types, defaults, normalizers (+ tests)
  lib/widget-route.server.ts          Shared loader/action for every widget route
  lib/trust-badges.ts                 Trust-badge catalog
  models/widget.server.ts             Prisma access for widget settings
  services/metafield-sync.server.ts   Prisma -> Admin metafieldsSet
  components/settings/                Reusable framework: GlobalSettingsPanel,
                                      WidgetSettingsForm, useWidgetSettingsForm, previews
extensions/searchaly-widgets/         Theme App Extension
  blocks/app-embed.liquid             Reads metafield, injects config JSON, loads assets
  assets/core.js                      Shared runtime: config parse, gates, registry, cart cache
  assets/<widget>.js                  One behavior file per widget (5 total)
  assets/searchaly.css                Widget styles (CSS-var driven)
prisma/schema.prisma                  Postgres; Session + WidgetSettings
```

Adding a widget reuses the framework: a settings screen (shared global panel + a few
fields via `useWidgetSettingsForm`) + one `assets/<widget>.js` that calls
`Searchaly.register(...)` — no new data model or sync code.

## Local setup

Prereqs: Node ≥ 20.19, a Shopify Partner account + development store, and a Postgres
database (Neon free tier recommended).

1. **Database** — create a free Postgres at <https://neon.tech>, copy the connection
   string, and put it in `.env`:
   ```
   DATABASE_URL="postgresql://…?sslmode=require"
   ```
   (See `.env.example`.) Then create the tables:
   ```bash
   npx prisma migrate dev --name init
   ```
2. **Run the app** (installs on your dev store via a Cloudflare tunnel — no hosting
   needed):
   ```bash
   npm install
   npm run dev
   ```
   The Shopify CLI handles Partner login, app creation, and injects
   `SHOPIFY_API_KEY/SECRET/URL` automatically.
3. **Enable the storefront widget** — in the dev store's theme editor:
   **Theme settings → App embeds → Searchaly Boost → on**. Then turn on the Sticky
   Add to Cart widget in the app dashboard and open any product page.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Run the app on a dev store (tunnel + auto-reload) |
| `npm run build` | Production build of the Remix app |
| `npm test` | Vitest unit tests (config contract) |
| `npx tsc --noEmit` | Typecheck |
| `npx prisma migrate dev` | Apply schema to Postgres |

## Testing

`npm test` runs the Vitest suite for the config contract
(`app/lib/widget-config.test.ts`) — defaults, normalization, invalid-input handling,
and the storefront payload builder. Storefront behavior is verified manually on a dev
store via `npm run dev`.

## Roadmap

v1.0 ✅ Sticky Cart · Free Shipping Bar · Cart Goal · Trust Badges · Announcement Bar.
v1.5 social proof (Sales Pop, Stock/Visitor Counter) · v2.0 revenue widgets (bundles,
quantity breaks, upsells) · v3.0 AI + real Store Health / Conversion Score.
