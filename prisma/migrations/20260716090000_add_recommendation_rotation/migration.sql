ALTER TABLE "clothing_items"
  ADD COLUMN IF NOT EXISTS "last_worn_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "wear_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "availability_status" TEXT NOT NULL DEFAULT 'available',
  ADD COLUMN IF NOT EXISTS "unavailable_until" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "last_recommended_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "recommendation_count" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "clothing_items"
  DROP CONSTRAINT IF EXISTS "clothing_items_availability_status_check";
ALTER TABLE "clothing_items"
  ADD CONSTRAINT "clothing_items_availability_status_check"
  CHECK ("availability_status" IN ('available', 'dirty', 'laundry', 'repair', 'packed', 'storage', 'loaned', 'reserved', 'unavailable'));

ALTER TABLE "outfit_recommendations"
  ADD COLUMN IF NOT EXISTS "recommendation_set_id" UUID,
  ADD COLUMN IF NOT EXISTS "option_index" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "engine_version" TEXT NOT NULL DEFAULT 'rotation-v1';

UPDATE "outfit_recommendations"
SET "recommendation_set_id" = "id"
WHERE "recommendation_set_id" IS NULL;

ALTER TABLE "outfit_recommendations"
  ALTER COLUMN "recommendation_set_id" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "outfit_recommendations_set_option_key"
  ON "outfit_recommendations" ("recommendation_set_id", "option_index");

CREATE TABLE IF NOT EXISTS "recommendation_items" (
  "recommendation_id" UUID NOT NULL REFERENCES "outfit_recommendations"("id") ON DELETE CASCADE,
  "clothing_item_id" UUID NOT NULL REFERENCES "clothing_items"("id") ON DELETE CASCADE,
  "position" INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY ("recommendation_id", "clothing_item_id")
);

CREATE INDEX IF NOT EXISTS "recommendation_items_clothing_item_idx"
  ON "recommendation_items" ("clothing_item_id");

CREATE INDEX IF NOT EXISTS "clothing_items_user_availability_idx"
  ON "clothing_items" ("user_id", "availability_status", "unavailable_until");

ALTER TABLE "recommendation_items" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read their own recommendation items" ON "recommendation_items";
CREATE POLICY "Users read their own recommendation items" ON "recommendation_items"
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM "outfit_recommendations" r
  WHERE r."id" = "recommendation_id" AND r."user_id" = (SELECT auth.uid())
));

DROP POLICY IF EXISTS "Users add their own recommendation items" ON "recommendation_items";
CREATE POLICY "Users add their own recommendation items" ON "recommendation_items"
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "outfit_recommendations" r
    WHERE r."id" = "recommendation_id" AND r."user_id" = (SELECT auth.uid())
  )
  AND EXISTS (
    SELECT 1 FROM "clothing_items" c
    WHERE c."id" = "clothing_item_id" AND c."user_id" = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Users delete their own recommendation items" ON "recommendation_items";
CREATE POLICY "Users delete their own recommendation items" ON "recommendation_items"
FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM "outfit_recommendations" r
  WHERE r."id" = "recommendation_id" AND r."user_id" = (SELECT auth.uid())
));
