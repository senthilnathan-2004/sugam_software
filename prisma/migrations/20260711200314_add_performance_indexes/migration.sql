/*
  Warnings:

  - Added the required column `category` to the `Notification` table without a default value. This is not possible if the table is not empty.
  - Added the required column `priority` to the `Notification` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Notification` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceNo" TEXT NOT NULL,
    "patientId" TEXT,
    "walkinName" TEXT,
    "walkinPhone" TEXT,
    "walkinEmail" TEXT,
    "doctorId" TEXT,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "items" TEXT NOT NULL,
    "subtotal" REAL NOT NULL,
    "gstAmount" REAL NOT NULL,
    "discount" REAL NOT NULL,
    "total" REAL NOT NULL,
    "paymentMode" TEXT NOT NULL,
    "paymentStatus" TEXT NOT NULL,
    "isReturn" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Invoice_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Invoice" ("date", "discount", "doctorId", "gstAmount", "id", "invoiceNo", "isReturn", "items", "patientId", "paymentMode", "paymentStatus", "subtotal", "total") SELECT "date", "discount", "doctorId", "gstAmount", "id", "invoiceNo", "isReturn", "items", "patientId", "paymentMode", "paymentStatus", "subtotal", "total" FROM "Invoice";
DROP TABLE "Invoice";
ALTER TABLE "new_Invoice" RENAME TO "Invoice";
CREATE UNIQUE INDEX "Invoice_invoiceNo_key" ON "Invoice"("invoiceNo");
CREATE INDEX "Invoice_patientId_idx" ON "Invoice"("patientId");
CREATE INDEX "Invoice_date_idx" ON "Invoice"("date");
CREATE INDEX "Invoice_paymentStatus_idx" ON "Invoice"("paymentStatus");
CREATE TABLE "new_Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "userId" TEXT,
    "relatedEntityId" TEXT,
    "relatedEntityType" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
-- Backfill the three new NOT NULL columns for pre-existing rows; without these
-- constants the INSERT violates NOT NULL on any non-empty table and the whole
-- migration (and app startup) fails on upgraded installs.
INSERT INTO "new_Notification" ("createdAt", "id", "isRead", "message", "title", "type", "userId", "priority", "category", "updatedAt") SELECT "createdAt", "id", "isRead", "message", "title", "type", "userId", 'MEDIUM', 'SYSTEM', "createdAt" FROM "Notification";
DROP TABLE "Notification";
ALTER TABLE "new_Notification" RENAME TO "Notification";
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");
CREATE INDEX "Notification_category_idx" ON "Notification"("category");
CREATE INDEX "Notification_priority_idx" ON "Notification"("priority");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Appointment_patientId_idx" ON "Appointment"("patientId");

-- CreateIndex
CREATE INDEX "Appointment_doctorId_idx" ON "Appointment"("doctorId");

-- CreateIndex
CREATE INDEX "Appointment_date_status_idx" ON "Appointment"("date", "status");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

-- CreateIndex
CREATE INDEX "Consultation_doctorId_idx" ON "Consultation"("doctorId");

-- CreateIndex
CREATE INDEX "Medicine_categoryId_idx" ON "Medicine"("categoryId");

-- CreateIndex
CREATE INDEX "Medicine_supplierId_idx" ON "Medicine"("supplierId");

-- CreateIndex
CREATE INDEX "Medicine_isActive_idx" ON "Medicine"("isActive");

-- CreateIndex
CREATE INDEX "MedicineBatch_expiryDate_idx" ON "MedicineBatch"("expiryDate");

-- CreateIndex
CREATE INDEX "MedicineBatch_supplierId_idx" ON "MedicineBatch"("supplierId");

-- CreateIndex
CREATE INDEX "Patient_isDeleted_createdAt_idx" ON "Patient"("isDeleted", "createdAt");

-- CreateIndex
CREATE INDEX "PatientDocument_patientId_idx" ON "PatientDocument"("patientId");

-- CreateIndex
CREATE INDEX "PatientVisit_patientId_idx" ON "PatientVisit"("patientId");

-- CreateIndex
CREATE INDEX "Payment_invoiceId_idx" ON "Payment"("invoiceId");

-- CreateIndex
CREATE INDEX "Payment_paidAt_idx" ON "Payment"("paidAt");

-- CreateIndex
CREATE INDEX "Prescription_patientId_idx" ON "Prescription"("patientId");

-- CreateIndex
CREATE INDEX "Prescription_doctorId_idx" ON "Prescription"("doctorId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_supplierId_idx" ON "PurchaseOrder"("supplierId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_date_idx" ON "PurchaseOrder"("date");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");
