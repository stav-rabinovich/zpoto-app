-- Migration: Update ListingRequest table to use pricing instead of priceHr
-- Date: 2025-11-13
-- Description: Replace priceHr field with pricing JSON field in ListingRequest table

-- Add pricing column
ALTER TABLE "ListingRequest" ADD COLUMN "pricing" TEXT;

-- Update existing records to have a default pricing
UPDATE "ListingRequest" 
SET "pricing" = '{"hour1": ' || CAST("priceHr" AS TEXT) || ', "hour2": ' || CAST("priceHr" AS TEXT) || ', "hour3": ' || CAST("priceHr" AS TEXT) || '}'
WHERE "pricing" IS NULL;

-- Remove the old priceHr column
ALTER TABLE "ListingRequest" DROP COLUMN "priceHr";

-- Show the table structure to verify
.schema ListingRequest
