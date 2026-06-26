import { prisma } from "@/lib/prisma";

async function main() {
  await prisma.$executeRawUnsafe("PRAGMA foreign_keys = ON");

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "User" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "passwordHash" TEXT NOT NULL,
      "role" TEXT NOT NULL DEFAULT 'USER',
      "status" TEXT NOT NULL DEFAULT 'ACTIVE',
      "loginFailures" INTEGER NOT NULL DEFAULT 0,
      "lockedUntil" DATETIME,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Session" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "tokenHash" TEXT NOT NULL,
      "rememberMe" BOOLEAN NOT NULL DEFAULT false,
      "userAgent" TEXT NOT NULL,
      "ipAddress" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "lastUsedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "expiresAt" DATETIME NOT NULL,
      "revokedAt" DATETIME,
      CONSTRAINT "Session_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User" ("id")
        ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "LoginAttempt" (
      "key" TEXT NOT NULL PRIMARY KEY,
      "failures" INTEGER NOT NULL DEFAULT 0,
      "firstFailureAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "lockedUntil" DATETIME
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SecurityEvent" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT,
      "actorUserId" TEXT,
      "type" TEXT NOT NULL,
      "summary" TEXT NOT NULL,
      "ipAddress" TEXT,
      "userAgent" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User" ("email")`
  );
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "Session_tokenHash_key" ON "Session" ("tokenHash")`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session" ("userId")`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "Session_expiresAt_idx" ON "Session" ("expiresAt")`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "LoginAttempt_lockedUntil_idx" ON "LoginAttempt" ("lockedUntil")`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "SecurityEvent_userId_createdAt_idx" ON "SecurityEvent" ("userId", "createdAt")`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "SecurityEvent_actorUserId_createdAt_idx" ON "SecurityEvent" ("actorUserId", "createdAt")`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "SecurityEvent_type_idx" ON "SecurityEvent" ("type")`
  );

  console.log("Local SQLite database is ready.");
}

main()
  .catch((error) => {
    console.error("Failed to prepare local SQLite database.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
