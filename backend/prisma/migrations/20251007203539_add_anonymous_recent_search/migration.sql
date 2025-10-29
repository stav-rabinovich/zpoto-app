-- CreateTable
CREATE TABLE "AnonymousRecentSearch" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "deviceId" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "lat" REAL,
    "lng" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "AnonymousRecentSearch_deviceId_createdAt_idx" ON "AnonymousRecentSearch"("deviceId", "createdAt");

-- CreateIndex
CREATE INDEX "AnonymousRecentSearch_deviceId_idx" ON "AnonymousRecentSearch"("deviceId");
