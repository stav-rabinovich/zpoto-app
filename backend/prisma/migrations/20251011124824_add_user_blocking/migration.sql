-- CreateTable
CREATE TABLE "MigrationLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "deviceId" TEXT NOT NULL,
    "favoritesMigrated" INTEGER NOT NULL DEFAULT 0,
    "savedPlacesMigrated" INTEGER NOT NULL DEFAULT 0,
    "recentSearchesMigrated" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "MigrationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "name" TEXT,
    "phone" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "googleId" TEXT,
    "facebookId" TEXT,
    "appleId" TEXT,
    "profilePicture" TEXT,
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" DATETIME,
    "registrationSource" TEXT,
    "migratedFromDeviceId" TEXT,
    "migrationCompletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("appleId", "createdAt", "email", "facebookId", "googleId", "id", "name", "password", "phone", "profilePicture", "role", "updatedAt") SELECT "appleId", "createdAt", "email", "facebookId", "googleId", "id", "name", "password", "phone", "profilePicture", "role", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");
CREATE UNIQUE INDEX "User_facebookId_key" ON "User"("facebookId");
CREATE UNIQUE INDEX "User_appleId_key" ON "User"("appleId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "MigrationLog_userId_idx" ON "MigrationLog"("userId");

-- CreateIndex
CREATE INDEX "MigrationLog_deviceId_idx" ON "MigrationLog"("deviceId");

-- CreateIndex
CREATE INDEX "MigrationLog_status_idx" ON "MigrationLog"("status");
