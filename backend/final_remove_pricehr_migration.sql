-- Final migration: Remove priceHr field completely from all tables
-- Date: 2025-11-14
-- Description: Complete removal of legacy priceHr field - system now uses pricing JSON exclusively

-- Remove priceHr from Parking table
ALTER TABLE "Parking" DROP COLUMN "priceHr";

-- Remove priceHr from ListingRequest table  
ALTER TABLE "ListingRequest" DROP COLUMN "priceHr";

-- Verify the changes
.schema Parking
.schema ListingRequest
