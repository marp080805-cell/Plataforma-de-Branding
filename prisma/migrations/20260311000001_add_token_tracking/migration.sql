ALTER TABLE "User" ADD COLUMN "tokenLimitMonthly" INTEGER;
ALTER TABLE "Message" ADD COLUMN "inputTokens" INTEGER;
ALTER TABLE "Message" ADD COLUMN "outputTokens" INTEGER;
