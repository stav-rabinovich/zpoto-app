-- CreateTable
CREATE TABLE "ListingRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "description" TEXT,
    "vehicleTypes" JSONB NOT NULL,
    "pricePerHour" INTEGER NOT NULL,
    "photos" JSONB NOT NULL,
    "lat" REAL,
    "lng" REAL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
