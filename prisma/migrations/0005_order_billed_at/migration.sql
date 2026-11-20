-- Billing moves from order creation to delivery (an order only counts toward
-- Total Bill once it is delivered). Existing orders were billed at creation
-- under the old rule, so every live (non-cancelled) order is already billed:
-- backfill billedAt so delivery never bills them a second time. Cancelled
-- orders had their bills reversed at cancellation, so they stay unbilled.
ALTER TABLE "Order" ADD COLUMN "billedAt" TIMESTAMP(3);
UPDATE "Order" SET "billedAt" = "createdAt" WHERE "status" <> 'CANCELLED';
