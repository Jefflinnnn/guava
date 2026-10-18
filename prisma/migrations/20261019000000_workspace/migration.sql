-- CreateTable
CREATE TABLE "Workspace" (
    "userId" TEXT NOT NULL,
    "neonUrl" TEXT NOT NULL,
    "database" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "pgVersion" INTEGER NOT NULL,
    "schemaVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

