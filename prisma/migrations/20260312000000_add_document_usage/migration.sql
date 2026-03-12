-- CreateTable
CREATE TABLE "DocumentUsage" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentUsage_projectId_idx" ON "DocumentUsage"("projectId");

-- CreateIndex
CREATE INDEX "DocumentUsage_userId_idx" ON "DocumentUsage"("userId");

-- CreateIndex
CREATE INDEX "DocumentUsage_createdAt_idx" ON "DocumentUsage"("createdAt");

-- AddForeignKey
ALTER TABLE "DocumentUsage" ADD CONSTRAINT "DocumentUsage_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentUsage" ADD CONSTRAINT "DocumentUsage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentUsage" ADD CONSTRAINT "DocumentUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
