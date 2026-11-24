-- Desk number is not needed; what delivery needs is the member's company /
-- organisation (several companies can share one floor of a building).
-- Replace User.desk with User.company. Old desk values are dropped on purpose:
-- they are desk labels, not company names.
ALTER TABLE "User" ADD COLUMN "company" TEXT;
ALTER TABLE "User" DROP COLUMN "desk";
