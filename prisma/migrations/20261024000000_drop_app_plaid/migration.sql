-- DropForeignKey
ALTER TABLE "PlaidItem" DROP CONSTRAINT "PlaidItem_userId_fkey";

-- DropForeignKey
ALTER TABLE "Account" DROP CONSTRAINT "Account_plaidItemId_fkey";

-- DropTable
DROP TABLE "PlaidItem";

-- DropTable
DROP TABLE "Account";

