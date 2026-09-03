UPDATE "clothing_items"
SET "category" = CASE
  WHEN "department" = 'Women' AND "category" IN ('Shirt / Top', 'Shirt/Tee', 'Shirts/Tops') THEN 'Shirts / Tees'
  WHEN "department" = 'Women' AND "category" = 'Sweater / Knitwear' THEN 'Sweaters / Knitwear'
  WHEN "department" = 'Women' AND "category" = 'Skirt' THEN 'Skirts'
  WHEN "department" = 'Women' AND "category" = 'Dress' THEN 'Dresses'
  WHEN "department" = 'Women' AND "category" = 'Accessory' THEN 'Accessories'
  WHEN "department" = 'Women' AND "category" = 'Perfume / Fragrance' THEN 'Perfumes / Fragrances'
  WHEN "department" = 'Men' AND "category" = 'Cologne / Grooming' THEN 'Colognes / Grooming'
  WHEN "category" = 'Other' THEN 'Other Pieces'
  ELSE "category"
END,
"updated_at" = CURRENT_TIMESTAMP
WHERE
  ("department" = 'Women' AND "category" IN ('Shirt / Top', 'Shirt/Tee', 'Shirts/Tops', 'Sweater / Knitwear', 'Skirt', 'Dress', 'Accessory', 'Perfume / Fragrance', 'Other'))
  OR ("department" = 'Men' AND "category" IN ('Cologne / Grooming', 'Other'));
