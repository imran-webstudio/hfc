-- Remove the Regular/One-time user split: every member is the same
-- single type of user with the same wallet and payment flow.
ALTER TABLE "User" DROP COLUMN "accountType";

DROP TYPE "AccountType";
