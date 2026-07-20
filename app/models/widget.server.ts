import type { Prisma } from "@prisma/client";
import prisma from "../db.server";
import {
  buildStorefrontConfig,
  defaultConfig,
  normalizeConfig,
  WIDGET_TYPES,
  type StorefrontConfig,
  type WidgetConfig,
  type WidgetType,
} from "../lib/widget-config";

export type WidgetRow = {
  type: WidgetType;
  enabled: boolean;
  config: WidgetConfig;
};

/** Get one widget's row for a shop, normalized. Returns defaults (disabled) if none exists. */
export async function getWidget(shop: string, type: WidgetType): Promise<WidgetRow> {
  const row = await prisma.widgetSettings.findUnique({
    where: { shop_type: { shop, type } },
  });
  if (!row) {
    return { type, enabled: false, config: defaultConfig(type) };
  }
  return {
    type,
    enabled: row.enabled,
    config: normalizeConfig(type, row.config),
  };
}

/** List every widget's status for the dashboard (fills missing widgets with defaults). */
export async function listWidgets(shop: string): Promise<WidgetRow[]> {
  const rows = await prisma.widgetSettings.findMany({ where: { shop } });
  const byType = new Map(rows.map((r) => [r.type as WidgetType, r]));
  return WIDGET_TYPES.map((type) => {
    const row = byType.get(type);
    return row
      ? { type, enabled: row.enabled, config: normalizeConfig(type, row.config) }
      : { type, enabled: false, config: defaultConfig(type) };
  });
}

/** Upsert a widget's enabled flag + config. `config` is normalized before persisting. */
export async function upsertWidget(
  shop: string,
  type: WidgetType,
  input: { enabled: boolean; config: unknown },
): Promise<WidgetRow> {
  const config = normalizeConfig(type, input.config);
  const data = {
    enabled: input.enabled,
    config: config as unknown as Prisma.InputJsonValue,
  };
  const row = await prisma.widgetSettings.upsert({
    where: { shop_type: { shop, type } },
    create: { shop, type, ...data },
    update: data,
  });
  return { type, enabled: row.enabled, config: normalizeConfig(type, row.config) };
}

/** Build the compact storefront payload for all of a shop's enabled widgets. */
export async function getStorefrontConfig(shop: string): Promise<StorefrontConfig> {
  const rows = await prisma.widgetSettings.findMany({
    where: { shop, enabled: true },
  });
  return buildStorefrontConfig(
    rows.map((r) => ({ type: r.type as WidgetType, enabled: r.enabled, config: r.config })),
  );
}
