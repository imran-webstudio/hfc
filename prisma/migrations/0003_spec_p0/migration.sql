-- Spec P0: multi-item orders, payment/accounting model, floors, audit log.
--
-- Accounting note: existing orders were billed on delivery (Regular members). The new
-- model bills at creation via ORDER_BILL ledger rows. Migrating historical ledger
-- balances perfectly is out of scope for this schema migration (balances are stored
-- values and stay as-is); new orders/payments follow the new invariant
--   stored balance = Total Deposit − Total Bill
-- from migration time forward. DUE payment rows become UNPAID.

-- 1. LedgerType: add ORDER_BILL + CASH_PAYMENT
ALTER TYPE "LedgerType" ADD VALUE IF NOT EXISTS 'ORDER_BILL';
ALTER TYPE "LedgerType" ADD VALUE IF NOT EXISTS 'CASH_PAYMENT';

-- 2. PaymentStatus: map DUE -> UNPAID, then drop DUE from the enum
UPDATE "Order" SET "paymentStatus" = 'UNPAID' WHERE "paymentStatus" = 'DUE';
ALTER TYPE "PaymentStatus" RENAME TO "PaymentStatus_old";
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'WALLET_CHARGED', 'CASH_PAID');
ALTER TABLE "Order" ALTER COLUMN "paymentStatus" DROP DEFAULT;
ALTER TABLE "Order" ALTER COLUMN "paymentStatus" TYPE "PaymentStatus" USING ("paymentStatus"::text::"PaymentStatus");
ALTER TABLE "Order" ALTER COLUMN "paymentStatus" SET DEFAULT 'UNPAID';
DROP TYPE "PaymentStatus_old";

-- 3. Order: add paidAt
ALTER TABLE "Order" ADD COLUMN "paidAt" TIMESTAMP(3);

-- 4. OrderItem table
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "optionId" TEXT,
    "slot" "Slot" NOT NULL,
    "title" TEXT NOT NULL,
    "unitPrice" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "subtotal" INTEGER NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");
CREATE INDEX "OrderItem_optionId_idx" ON "OrderItem"("optionId");
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "MenuOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: every existing single-dish order becomes a one-item order.
-- gen_random_uuid()::text is good enough for a one-off backfill id.
INSERT INTO "OrderItem" ("id", "orderId", "optionId", "slot", "title", "unitPrice", "quantity", "subtotal")
SELECT gen_random_uuid()::text, "id", "optionId", "slot", "title", "unitPrice", "quantity", "amount" FROM "Order";

-- 5. Order: drop the single-dish columns
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_optionId_fkey";
DROP INDEX IF EXISTS "Order_optionId_idx";
ALTER TABLE "Order" DROP COLUMN "optionId";
ALTER TABLE "Order" DROP COLUMN "slot";
ALTER TABLE "Order" DROP COLUMN "title";
ALTER TABLE "Order" DROP COLUMN "unitPrice";
ALTER TABLE "Order" DROP COLUMN "quantity";

-- 6. Floor table (dynamic floors per building)
CREATE TABLE "Floor" (
    "id" TEXT NOT NULL,
    "officeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Floor_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Floor_officeId_name_key" ON "Floor"("officeId", "name");
CREATE INDEX "Floor_officeId_idx" ON "Floor"("officeId");
ALTER TABLE "Floor" ADD CONSTRAINT "Floor_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill floors from the distinct floor strings members already use, per office.
INSERT INTO "Floor" ("id", "officeId", "name")
SELECT gen_random_uuid()::text, "zoneId", TRIM("floor") FROM "User"
WHERE "zoneId" IS NOT NULL AND "floor" IS NOT NULL AND TRIM("floor") <> ''
GROUP BY "zoneId", TRIM("floor")
ON CONFLICT ("officeId", "name") DO NOTHING;

-- 7. AuditLog table (staff-side; survives Clear Order History)
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "memberId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "detail" TEXT,
    "amount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AuditLog_memberId_createdAt_idx" ON "AuditLog"("memberId", "createdAt");
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
