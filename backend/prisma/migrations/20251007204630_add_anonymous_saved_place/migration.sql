-- CreateTable
CREATE TABLE "AnonymousSavedPlace" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "deviceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "AnonymousSavedPlace_deviceId_createdAt_idx" ON "AnonymousSavedPlace"("deviceId", "createdAt");

-- CreateIndex
CREATE INDEX "AnonymousSavedPlace_deviceId_idx" ON "AnonymousSavedPlace"("deviceId");
