-- CreateTable
CREATE TABLE "IntegrationKeys" (
    "userId" TEXT NOT NULL,
    "plaidEnv" TEXT,
    "plaidClientId" TEXT,
    "plaidSecret" TEXT,
    "plaidVerifiedAt" TIMESTAMP(3),
    "neonUrl" TEXT,
    "neonDatabase" TEXT,
    "neonRegion" TEXT,
    "neonPgVersion" INTEGER,
    "neonVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationKeys_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "IntegrationKeys" ADD CONSTRAINT "IntegrationKeys_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

