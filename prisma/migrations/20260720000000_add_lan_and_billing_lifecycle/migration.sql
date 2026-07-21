-- Offline multi-PC LAN feature.
-- Additive only: billing lifecycle, durable invoice<->consultation link,
-- billing idempotency, audit device/source attribution, and a paired-device
-- registry. Safe to apply in-place on an existing standalone database.

-- Consultation billing lifecycle (IN_CONSULTATION -> READY_FOR_BILLING -> BILLED).
-- New rows default to IN_CONSULTATION (matches schema.prisma); the completion
-- handler sets READY_FOR_BILLING explicitly. Existing/historical consultations
-- are backfilled to 'CLOSED' by the UPDATE below so they can NEVER auto-appear
-- in the Ready-for-Billing queue after an upgrade.
ALTER TABLE "Consultation" ADD COLUMN "billingStatus" TEXT NOT NULL DEFAULT 'IN_CONSULTATION';
UPDATE "Consultation" SET "billingStatus" = 'CLOSED';
ALTER TABLE "Consultation" ADD COLUMN "completedAt" DATETIME;

-- Doctor-reference-only fee. Never read/rendered by billing/invoice/revenue.
ALTER TABLE "Consultation" ADD COLUMN "consultationFee" REAL NOT NULL DEFAULT 0;

-- Invoice: durable link to the exact billed consultation (+ duplicate-bill guard
-- via the UNIQUE index) and an idempotency key for safe LAN retries.
ALTER TABLE "Invoice" ADD COLUMN "consultationId" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "idempotencyKey" TEXT;

-- AuditLog: device/source attribution for mutations arriving over the LAN.
ALTER TABLE "AuditLog" ADD COLUMN "deviceId" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "deviceName" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "source" TEXT;

-- Paired-device registry (Host-owned). tokenHash = sha256 of the device token;
-- the plaintext is shown to the client once at pairing and never stored here.
CREATE TABLE "Device" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "pairedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" DATETIME,
    "revoked" BOOLEAN NOT NULL DEFAULT false
);

-- UNIQUE indexes: SQLite treats NULLs as distinct, so many walk-in/direct-sale
-- invoices (NULL consultationId / idempotencyKey) coexist; only real values are
-- constrained. consultationId UNIQUE is the DB-level duplicate-billing guard.
CREATE UNIQUE INDEX "Invoice_consultationId_key" ON "Invoice"("consultationId");
CREATE UNIQUE INDEX "Invoice_idempotencyKey_key" ON "Invoice"("idempotencyKey");
CREATE INDEX "Consultation_billingStatus_idx" ON "Consultation"("billingStatus");
CREATE INDEX "Device_revoked_idx" ON "Device"("revoked");
