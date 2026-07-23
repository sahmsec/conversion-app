-- Add the COUNTDOWN widget type. Idempotent so it is safe under repeated deploys.
ALTER TYPE "WidgetType" ADD VALUE IF NOT EXISTS 'COUNTDOWN';
