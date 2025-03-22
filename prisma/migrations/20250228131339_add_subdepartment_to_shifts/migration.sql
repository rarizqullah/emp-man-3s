/*
  Warnings:

  - You are about to drop the column `overtimeEnd` on the `shifts` table. All the data in the column will be lost.
  - You are about to drop the column `overtimeStart` on the `shifts` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "shifts" DROP COLUMN "overtimeEnd",
DROP COLUMN "overtimeStart",
ADD COLUMN     "regularOvertimeEnd" TIMESTAMP(3),
ADD COLUMN     "regularOvertimeStart" TIMESTAMP(3),
ADD COLUMN     "subDepartmentId" TEXT,
ADD COLUMN     "weeklyOvertimeEnd" TIMESTAMP(3),
ADD COLUMN     "weeklyOvertimeStart" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_subDepartmentId_fkey" FOREIGN KEY ("subDepartmentId") REFERENCES "sub_departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
