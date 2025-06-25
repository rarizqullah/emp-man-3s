/*
  Warnings:

  - You are about to drop the column `actualLateMinutes` on the `attendances` table. All the data in the column will be lost.
  - You are about to drop the column `roundedLateMinutes` on the `attendances` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "attendances" DROP COLUMN "actualLateMinutes",
DROP COLUMN "roundedLateMinutes",
ADD COLUMN     "minutesLate" INTEGER,
ADD COLUMN     "roundedMinutesLate" INTEGER;
