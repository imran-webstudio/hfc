-- Companies are predefined by admins per building, just like floors:
-- a registry table; members pick one in Profile and User.company stores the name.
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "officeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Company_officeId_name_key" ON "Company"("officeId", "name");
CREATE INDEX "Company_officeId_idx" ON "Company"("officeId");
ALTER TABLE "Company" ADD CONSTRAINT "Company_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE CASCADE ON UPDATE CASCADE;
