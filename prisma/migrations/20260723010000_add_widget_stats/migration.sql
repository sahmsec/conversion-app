-- CreateTable
CREATE TABLE "WidgetStat" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "widget" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WidgetStat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WidgetStat_shop_widget_event_day_key" ON "WidgetStat"("shop", "widget", "event", "day");

-- CreateIndex
CREATE INDEX "WidgetStat_shop_idx" ON "WidgetStat"("shop");
