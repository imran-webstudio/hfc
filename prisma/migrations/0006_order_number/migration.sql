-- Human order numbers: every order gets a sequential number shown to members
-- as #HF000001, #HF000002, ... Existing orders are numbered oldest-first;
-- the Counter row continues the sequence for new orders.
CREATE TABLE "Counter" (
    "id" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Counter_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Order" ADD COLUMN "number" INTEGER;

WITH numbered AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt" ASC, id ASC) AS rn FROM "Order"
)
UPDATE "Order" SET "number" = numbered.rn FROM numbered WHERE "Order".id = numbered.id;

ALTER TABLE "Order" ALTER COLUMN "number" SET NOT NULL;
CREATE UNIQUE INDEX "Order_number_key" ON "Order"("number");

INSERT INTO "Counter" (id, value) VALUES ('order', COALESCE((SELECT MAX("number") FROM "Order"), 0));
