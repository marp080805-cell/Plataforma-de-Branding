-- AddColumns: cache token tracking for accurate cost calculation
ALTER TABLE "Message" ADD COLUMN "cacheCreationTokens" INTEGER;
ALTER TABLE "Message" ADD COLUMN "cacheReadTokens" INTEGER;
