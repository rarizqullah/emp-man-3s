/*
  Warnings:

  - You are about to drop the `ContractHistory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ShiftHistory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WarningHistory` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ContractHistory" DROP CONSTRAINT "ContractHistory_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "ShiftHistory" DROP CONSTRAINT "ShiftHistory_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "ShiftHistory" DROP CONSTRAINT "ShiftHistory_shiftId_fkey";

-- DropForeignKey
ALTER TABLE "WarningHistory" DROP CONSTRAINT "WarningHistory_employeeId_fkey";

-- DropTable
DROP TABLE "ContractHistory";

-- DropTable
DROP TABLE "ShiftHistory";

-- DropTable
DROP TABLE "WarningHistory";

-- CreateTable
CREATE TABLE "contract_history" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "contractType" "ContractType" NOT NULL,
    "contractNumber" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_history" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shift_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warning_history" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "warningStatus" "WarningStatus" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "reason" TEXT NOT NULL,
    "attachmentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warning_history_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "contract_history" ADD CONSTRAINT "contract_history_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_history" ADD CONSTRAINT "shift_history_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_history" ADD CONSTRAINT "shift_history_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "shifts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warning_history" ADD CONSTRAINT "warning_history_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
