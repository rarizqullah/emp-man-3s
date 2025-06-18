-- AlterTable
ALTER TABLE "shifts" ADD COLUMN     "workingDays" TEXT[] DEFAULT ARRAY[]::TEXT[];
