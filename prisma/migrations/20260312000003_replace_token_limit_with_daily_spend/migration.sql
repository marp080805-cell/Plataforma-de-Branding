-- Replace monthly token limit with a daily monetary spend limit.
-- Limits are now in USD (Float) and reset each calendar day (non-cumulative).
ALTER TABLE "User" DROP COLUMN IF EXISTS "tokenLimitMonthly";
ALTER TABLE "User" ADD COLUMN "dailySpendLimit" DOUBLE PRECISION;
