-- AlterTable
ALTER TABLE "attendances" ADD COLUMN     "autoCutOffReason" TEXT,
ADD COLUMN     "breakEndTime" TIMESTAMP(3),
ADD COLUMN     "breakStartTime" TIMESTAMP(3),
ADD COLUMN     "isAutoCutOff" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isCheckInValidated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isCheckOutValidated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "overtimeEndTime" TIMESTAMP(3),
ADD COLUMN     "overtimeStartTime" TIMESTAMP(3),
ALTER COLUMN "checkInTime" DROP NOT NULL;
