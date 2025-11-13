-- Migration: Remove priceHr field from Parking table
-- Date: 2025-11-13
-- Description: Remove the legacy priceHr field as the system now uses pricing JSON field exclusively

-- Remove the priceHr column from Parking table
ALTER TABLE "Parking" DROP COLUMN "priceHr";

-- Show the table structure to verify
.schema Parking
