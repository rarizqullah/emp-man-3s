/*
  Warnings:

  - You are about to drop the column `minutesLate` on the `attendances` table. All the data in the column will be lost.
  - You are about to drop the column `roundedMinutesLate` on the `attendances` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "attendances" DROP COLUMN "minutesLate",
DROP COLUMN "roundedMinutesLate",
ADD COLUMN     "actualLateMinutes" INTEGER,
ADD COLUMN     "roundedLateMinutes" INTEGER;
