-- Sales Pop: new widget type + rolling recent-orders table.
ALTER TYPE "WidgetType" ADD VALUE IF NOT EXISTS 'SALES_POP';

CREATE TABLE "RecentSale" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "product" TEXT NOT NULL,
    "city" TEXT,
    "region" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecentSale_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RecentSale_shop_createdAt_idx" ON "RecentSale"("shop", "createdAt");
