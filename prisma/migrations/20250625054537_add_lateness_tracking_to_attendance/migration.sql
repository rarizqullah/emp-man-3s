-- AlterTable
ALTER TABLE "attendances" ADD COLUMN     "isLate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "latenessMessage" TEXT,
ADD COLUMN     "minutesLate" INTEGER,
ADD COLUMN     "roundedMinutesLate" INTEGER;
