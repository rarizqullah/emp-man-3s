-- CreateTable
CREATE TABLE "allowances" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "applicableRule" TEXT NOT NULL,
    "umkAmount" DOUBLE PRECISION,
    "companyPercentage" DOUBLE PRECISION,
    "companyAmount" DOUBLE PRECISION,
    "employeePercentage" DOUBLE PRECISION,
    "employeeAmount" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "allowances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "allowances_name_key" ON "allowances"("name");

-- DropForeignKey
ALTER TABLE "allowance_values" DROP CONSTRAINT "allowance_values_allowanceTypeId_fkey";

-- DropForeignKey
ALTER TABLE "allowance_values" DROP CONSTRAINT "allowance_values_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "employee_allowances" DROP CONSTRAINT "employee_allowances_allowanceValueId_fkey";

-- DropTable
DROP TABLE "allowance_types";

-- DropTable
DROP TABLE "allowance_values";

-- AlterTable
ALTER TABLE "employee_allowances" DROP COLUMN "allowanceValueId",
ADD COLUMN     "allowanceId" TEXT NOT NULL,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AddForeignKey
ALTER TABLE "employee_allowances" ADD CONSTRAINT "employee_allowances_allowanceId_fkey" FOREIGN KEY ("allowanceId") REFERENCES "allowances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "employee_allowances_employeeId_allowanceId_key" ON "employee_allowances"("employeeId", "allowanceId");
