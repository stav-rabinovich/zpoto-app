-- Reset all parkings to AUTO mode and clean approval-related data
-- This script converts the system to auto-approval only

-- 1. Set all parking to AUTO mode
UPDATE "Parking" SET "approvalMode" = 'AUTO';

-- 2. Convert all PENDING_APPROVAL bookings to CONFIRMED
UPDATE "Booking" SET "status" = 'CONFIRMED' WHERE "status" = 'PENDING_APPROVAL';

-- 3. Clean up approval-related fields in existing bookings
UPDATE "Booking" SET 
  "approvalExpiresAt" = NULL,
  "rejectedAt" = NULL,
  "rejectionReason" = NULL
WHERE "approvalExpiresAt" IS NOT NULL 
   OR "rejectedAt" IS NOT NULL 
   OR "rejectionReason" IS NOT NULL;

-- 4. Set approvedAt for all CONFIRMED bookings that don't have it
UPDATE "Booking" SET "approvedAt" = "createdAt" 
WHERE "status" = 'CONFIRMED' AND "approvedAt" IS NULL;

-- Check results
SELECT "approvalMode", COUNT(*) as count FROM "Parking" GROUP BY "approvalMode";
SELECT "status", COUNT(*) as count FROM "Booking" GROUP BY "status";
