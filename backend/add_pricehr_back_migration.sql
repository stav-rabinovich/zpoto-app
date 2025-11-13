-- Temporary migration: Add back priceHr field with default values
-- This is temporary until we finish cleaning up all references

-- Add priceHr back to Parking table
ALTER TABLE "Parking" ADD COLUMN "priceHr" REAL DEFAULT 10;

-- Add priceHr back to ListingRequest table  
ALTER TABLE "ListingRequest" ADD COLUMN "priceHr" REAL DEFAULT 10;

-- Update existing records to sync priceHr with pricing
UPDATE "Parking" 
SET "priceHr" = 
  CASE 
    WHEN "pricing" IS NOT NULL AND "pricing" != '' THEN 
      CAST(json_extract("pricing", '$.hour1') AS REAL)
    ELSE 10
  END
WHERE "priceHr" IS NULL OR "priceHr" = 0;

-- Show tables
.schema Parking
.schema ListingRequest
