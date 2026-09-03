CREATE TABLE IF NOT EXISTS "wardrobe_pair_preferences" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "item_a_id" UUID NOT NULL REFERENCES "clothing_items"("id") ON DELETE CASCADE,
  "item_b_id" UUID NOT NULL REFERENCES "clothing_items"("id") ON DELETE CASCADE,
  "preference" TEXT NOT NULL DEFAULT 'incompatible',
  "reason" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "wardrobe_pair_preferences_distinct_items" CHECK ("item_a_id" <> "item_b_id"),
  CONSTRAINT "wardrobe_pair_preferences_ordered_items" CHECK ("item_a_id"::text < "item_b_id"::text),
  CONSTRAINT "wardrobe_pair_preferences_user_item_pair_key" UNIQUE ("user_id", "item_a_id", "item_b_id")
);

CREATE INDEX IF NOT EXISTS "wardrobe_pair_preferences_user_preference_idx"
  ON "wardrobe_pair_preferences" ("user_id", "preference");

ALTER TABLE "wardrobe_pair_preferences" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read their wardrobe pair preferences" ON "wardrobe_pair_preferences";
CREATE POLICY "Users read their wardrobe pair preferences"
  ON "wardrobe_pair_preferences" FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert their wardrobe pair preferences" ON "wardrobe_pair_preferences";
CREATE POLICY "Users insert their wardrobe pair preferences"
  ON "wardrobe_pair_preferences" FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM clothing_items WHERE id = item_a_id AND user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM clothing_items WHERE id = item_b_id AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users update their wardrobe pair preferences" ON "wardrobe_pair_preferences";
CREATE POLICY "Users update their wardrobe pair preferences"
  ON "wardrobe_pair_preferences" FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete their wardrobe pair preferences" ON "wardrobe_pair_preferences";
CREATE POLICY "Users delete their wardrobe pair preferences"
  ON "wardrobe_pair_preferences" FOR DELETE
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON "wardrobe_pair_preferences" TO authenticated;

-- Preserve the explicit incompatibility the user already communicated before
-- this durable feedback table existed.
WITH sea_piece AS (
  SELECT id, user_id
  FROM clothing_items
  WHERE (designer ILIKE '%sea%' OR item_name ILIKE '%sea%')
    AND item_name ILIKE '%embroider%'
), orange_shorts AS (
  SELECT id, user_id
  FROM clothing_items
  WHERE (designer ILIKE '%veronica%beard%' OR item_name ILIKE '%veronica%beard%')
    AND (category ILIKE '%short%' OR item_name ILIKE '%short%')
    AND (color ILIKE '%orange%' OR item_name ILIKE '%orange%')
)
INSERT INTO wardrobe_pair_preferences (
  user_id, item_a_id, item_b_id, preference, reason
)
SELECT
  sea_piece.user_id,
  CASE WHEN sea_piece.id::text < orange_shorts.id::text THEN sea_piece.id ELSE orange_shorts.id END,
  CASE WHEN sea_piece.id::text < orange_shorts.id::text THEN orange_shorts.id ELSE sea_piece.id END,
  'incompatible',
  'User explicitly stated that the Sea NY embroidered shirt and orange Veronica Beard shorts do not match.'
FROM sea_piece
JOIN orange_shorts USING (user_id)
ON CONFLICT (user_id, item_a_id, item_b_id)
DO UPDATE SET
  preference = 'incompatible',
  reason = EXCLUDED.reason,
  updated_at = now();
