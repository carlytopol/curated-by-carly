ALTER TABLE "clothing_items"
  ADD COLUMN IF NOT EXISTS "available_override_at" TIMESTAMPTZ;
