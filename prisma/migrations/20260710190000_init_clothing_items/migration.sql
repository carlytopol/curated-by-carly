CREATE SCHEMA IF NOT EXISTS "public";

CREATE TABLE "clothing_items" (
  "id" UUID NOT NULL, "user_id" UUID NOT NULL, "designer" TEXT, "item_name" TEXT,
  "category" TEXT, "size" TEXT, "color" TEXT, "season" TEXT,
  "favorite" BOOLEAN NOT NULL DEFAULT false, "image_url" TEXT,
  "analysis_status" TEXT NOT NULL DEFAULT 'pending', "analysis_metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "clothing_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_profiles" (
  "user_id" UUID NOT NULL, "display_name" TEXT, "timezone" TEXT, "location_name" TEXT,
  "latitude" DOUBLE PRECISION, "longitude" DOUBLE PRECISION,
  "measurement_unit" TEXT NOT NULL DEFAULT 'imperial', "height_cm" DOUBLE PRECISION,
  "weight_kg" DOUBLE PRECISION, "top_size" TEXT, "bottom_size" TEXT, "dress_size" TEXT,
  "shoe_size" TEXT, "proportions" TEXT, "fit_notes" TEXT, "style_notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("user_id")
);

CREATE TABLE "clothing_photos" (
  "id" UUID NOT NULL, "user_id" UUID NOT NULL, "clothing_item_id" UUID NOT NULL,
  "storage_path" TEXT NOT NULL, "alt_text" TEXT, "mime_type" TEXT NOT NULL,
  "width" INTEGER, "height" INTEGER, "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "clothing_photos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "outfits" (
  "id" UUID NOT NULL, "user_id" UUID NOT NULL, "title" TEXT, "occasion" TEXT, "notes" TEXT,
  "cover_path" TEXT, "archived_at" TIMESTAMP(3), "worn_at" TIMESTAMP(3), "use_as_style_signal" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "outfits_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "outfit_items" (
  "outfit_id" UUID NOT NULL, "clothing_item_id" UUID NOT NULL, "position" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "outfit_items_pkey" PRIMARY KEY ("outfit_id", "clothing_item_id")
);

CREATE TABLE "daily_events" (
  "id" UUID NOT NULL, "user_id" UUID NOT NULL, "event_date" DATE NOT NULL,
  "starts_at" TIMESTAMP(3), "title" TEXT NOT NULL, "location" TEXT, "dress_code" TEXT,
  "notes" TEXT, "position" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "daily_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "outfit_recommendations" (
  "id" UUID NOT NULL, "user_id" UUID NOT NULL, "daily_event_id" UUID NOT NULL, "outfit_id" UUID,
  "summary" TEXT NOT NULL, "rationale" TEXT, "status" TEXT NOT NULL DEFAULT 'suggested',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "selected_at" TIMESTAMP(3), "worn_at" TIMESTAMP(3),
  CONSTRAINT "outfit_recommendations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "shopper_conversations" (
  "id" UUID NOT NULL, "user_id" UUID NOT NULL, "title" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "shopper_conversations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "shopper_messages" (
  "id" UUID NOT NULL, "user_id" UUID NOT NULL, "conversation_id" UUID NOT NULL,
  "role" TEXT NOT NULL, "content" TEXT NOT NULL, "product_url" TEXT, "image_path" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "shopper_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "clothing_items_user_id_created_at_idx" ON "clothing_items"("user_id", "created_at" DESC);
CREATE INDEX "clothing_items_user_id_favorite_idx" ON "clothing_items"("user_id", "favorite");
CREATE INDEX "clothing_photos_user_id_clothing_item_id_sort_order_idx" ON "clothing_photos"("user_id", "clothing_item_id", "sort_order");
CREATE UNIQUE INDEX "clothing_photos_user_id_storage_path_key" ON "clothing_photos"("user_id", "storage_path");
CREATE INDEX "outfits_user_id_worn_at_idx" ON "outfits"("user_id", "worn_at" DESC);
CREATE INDEX "outfits_user_id_archived_at_idx" ON "outfits"("user_id", "archived_at" DESC);
CREATE INDEX "daily_events_user_id_event_date_position_idx" ON "daily_events"("user_id", "event_date", "position");
CREATE INDEX "outfit_recommendations_user_id_daily_event_id_idx" ON "outfit_recommendations"("user_id", "daily_event_id");
CREATE INDEX "shopper_conversations_user_id_updated_at_idx" ON "shopper_conversations"("user_id", "updated_at" DESC);
CREATE INDEX "shopper_messages_user_id_conversation_id_created_at_idx" ON "shopper_messages"("user_id", "conversation_id", "created_at");

ALTER TABLE "clothing_photos" ADD CONSTRAINT "clothing_photos_clothing_item_id_fkey" FOREIGN KEY ("clothing_item_id") REFERENCES "clothing_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "outfit_items" ADD CONSTRAINT "outfit_items_outfit_id_fkey" FOREIGN KEY ("outfit_id") REFERENCES "outfits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "outfit_items" ADD CONSTRAINT "outfit_items_clothing_item_id_fkey" FOREIGN KEY ("clothing_item_id") REFERENCES "clothing_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "outfit_recommendations" ADD CONSTRAINT "outfit_recommendations_daily_event_id_fkey" FOREIGN KEY ("daily_event_id") REFERENCES "daily_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "outfit_recommendations" ADD CONSTRAINT "outfit_recommendations_outfit_id_fkey" FOREIGN KEY ("outfit_id") REFERENCES "outfits"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "shopper_messages" ADD CONSTRAINT "shopper_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "shopper_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
