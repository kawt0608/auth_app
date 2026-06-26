CREATE TABLE "SecurityEvent" (
  "id" TEXT NOT NULL,
  "userId" VARCHAR(191),
  "actorUserId" VARCHAR(191),
  "type" VARCHAR(80) NOT NULL,
  "summary" VARCHAR(280) NOT NULL,
  "ipAddress" VARCHAR(80),
  "userAgent" VARCHAR(240),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SecurityEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SecurityEvent_userId_createdAt_idx" ON "SecurityEvent"("userId", "createdAt");
CREATE INDEX "SecurityEvent_actorUserId_createdAt_idx" ON "SecurityEvent"("actorUserId", "createdAt");
CREATE INDEX "SecurityEvent_type_idx" ON "SecurityEvent"("type");
