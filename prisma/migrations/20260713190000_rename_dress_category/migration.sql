UPDATE "clothing_items"
SET "category" = 'Dresses', "updated_at" = CURRENT_TIMESTAMP
WHERE "department" = 'Women' AND "category" = 'Dress';
