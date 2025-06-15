import { prisma } from '@/lib/db/prisma';
import { ContractType, PaymentStatus } from '@prisma/client';
import { format } from 'date-fns';

// Interface untuk input perhitungan gaji
export interface SalaryCalculationInput {
  employeeId: string;
  periodStart: Date;
  periodEnd: Date;
  basis?: 'DAILY' | 'MONTHLY' | 'YEARLY';
}

// Interface untuk hasil perhitungan gaji
export interface SalaryCalculationResult {
  employeeId: string;
  periodStart: Date;
  periodEnd: Date;
  mainWorkHours: number;
  regularOvertimeHours: number;
  weeklyOvertimeHours: number;
  baseSalary: number;
  overtimeSalary: number;
  weeklyOvertimeSalary: number;
  totalAllowances: number;
  totalSalary: number;
  employee?: any;
  allowances?: any[];
}

// Interface untuk filter salary
export interface SalaryFilter {
  departmentId?: string;
  contractType?: ContractType;
  paymentStatus?: PaymentStatus;
  startDate?: Date;
  endDate?: Date;
  employeeId?: string;
}

/**
 * Menghitung gaji karyawan berdasarkan data attendance dan konfigurasi
 */
export async function calculateEmployeeSalary(input: SalaryCalculationInput): Promise<SalaryCalculationResult> {
  const { employeeId, periodStart, periodEnd } = input;

  // Ambil data karyawan dengan relasi yang diperlukan
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      user: { select: { name: true, email: true } },
      department: true,
      position: true,
      shift: true,
      employeeAllowances: {
        include: {
          allowanceValue: {
            include: {
              allowanceType: true
            }
          }
        }
      }
    }
  });

  if (!employee) {
    throw new Error('Karyawan tidak ditemukan');
  }

  // Ambil data attendance untuk periode yang diminta
  const attendances = await prisma.attendance.findMany({
    where: {
      employeeId,
      attendanceDate: {
        gte: periodStart,
        lte: periodEnd
      }
    }
  });

  // Hitung total jam kerja dari attendance
  const totalMainWorkHours = attendances.reduce((total, att) => total + (att.mainWorkHours || 0), 0);
  const totalRegularOvertimeHours = attendances.reduce((total, att) => total + (att.regularOvertimeHours || 0), 0);
  const totalWeeklyOvertimeHours = attendances.reduce((total, att) => total + (att.weeklyOvertimeHours || 0), 0);

  // Ambil tarif gaji berdasarkan departemen dan tipe kontrak
  const salaryRate = await prisma.salaryRate.findUnique({
    where: {
      contractType_departmentId: {
        contractType: employee.contractType,
        departmentId: employee.departmentId
      }
    }
  });

  if (!salaryRate) {
    throw new Error(`Tarif gaji tidak ditemukan untuk departemen ${employee.department.name} dengan tipe kontrak ${employee.contractType}`);
  }

  // Hitung gaji pokok berdasarkan jam kerja utama
  const baseSalary = totalMainWorkHours * salaryRate.mainWorkHourRate;

  // Hitung gaji lembur reguler
  const overtimeSalary = totalRegularOvertimeHours * salaryRate.regularOvertimeRate;

  // Hitung gaji lembur mingguan
  const weeklyOvertimeSalary = totalWeeklyOvertimeHours * salaryRate.weeklyOvertimeRate;

  // Hitung total tunjangan
  const totalAllowances = employee.employeeAllowances.reduce((total, empAllowance) => {
    return total + empAllowance.allowanceValue.value;
  }, 0);

  // Hitung total gaji
  const totalSalary = baseSalary + overtimeSalary + weeklyOvertimeSalary + totalAllowances;

  return {
    employeeId,
    periodStart,
    periodEnd,
    mainWorkHours: totalMainWorkHours,
    regularOvertimeHours: totalRegularOvertimeHours,
    weeklyOvertimeHours: totalWeeklyOvertimeHours,
    baseSalary: Math.round(baseSalary),
    overtimeSalary: Math.round(overtimeSalary),
    weeklyOvertimeSalary: Math.round(weeklyOvertimeSalary),
    totalAllowances: Math.round(totalAllowances),
    totalSalary: Math.round(totalSalary),
    employee,
    allowances: employee.employeeAllowances.map(empAllowance => ({
      type: empAllowance.allowanceValue.allowanceType.name,
      value: empAllowance.allowanceValue.value
    }))
  };
}

/**
 * Menyimpan hasil perhitungan gaji ke database
 */
export async function saveSalaryCalculation(calculation: SalaryCalculationResult): Promise<any> {
  return prisma.salary.create({
    data: {
      employeeId: calculation.employeeId,
      periodStart: calculation.periodStart,
      periodEnd: calculation.periodEnd,
      mainWorkHours: calculation.mainWorkHours,
      regularOvertimeHours: calculation.regularOvertimeHours,
      weeklyOvertimeHours: calculation.weeklyOvertimeHours,
      baseSalary: calculation.baseSalary,
      overtimeSalary: calculation.overtimeSalary,
      weeklyOvertimeSalary: calculation.weeklyOvertimeSalary,
      totalAllowances: calculation.totalAllowances,
      totalSalary: calculation.totalSalary,
      paymentStatus: PaymentStatus.UNPAID
    },
    include: {
      employee: {
        include: {
          user: { select: { name: true, email: true } },
          department: true,
          position: true
        }
      }
    }
  });
}

/**
 * Membuat slip gaji untuk semua karyawan dalam periode tertentu
 */
export async function generateSalariesForPeriod(periodStart: Date, periodEnd: Date, departmentId?: string): Promise<any[]> {
  // Ambil daftar karyawan yang aktif (kontrak belum berakhir atau tidak ada tanggal berakhir)
  const whereCondition: any = {
    OR: [
      { contractEndDate: { gte: periodStart } }, // Kontrak masih aktif
      { contractEndDate: null } // Kontrak permanen tanpa tanggal berakhir
    ]
  };

  if (departmentId) {
    whereCondition.departmentId = departmentId;
  }

  const employees = await prisma.employee.findMany({
    where: whereCondition,
    include: {
      user: { select: { name: true, email: true } },
      department: true
    }
  });

  const results = [];

  // Hitung gaji untuk setiap karyawan
  for (const employee of employees) {
    try {
      // Cek apakah gaji untuk periode ini sudah ada
      const existingSalary = await prisma.salary.findFirst({
        where: {
          employeeId: employee.id,
          periodStart: periodStart,
          periodEnd: periodEnd
        }
      });

      if (existingSalary) {
        console.log(`Gaji untuk ${employee.user.name} periode ${format(periodStart, 'MM/yyyy')} sudah ada`);
        continue;
      }

      // Hitung gaji karyawan
      const calculation = await calculateEmployeeSalary({
        employeeId: employee.id,
        periodStart,
        periodEnd
      });

      // Simpan ke database
      const savedSalary = await saveSalaryCalculation(calculation);
      results.push(savedSalary);

      console.log(`Gaji berhasil dihitung untuk ${employee.user.name}: ${calculation.totalSalary}`);
    } catch (error) {
      console.error(`Error calculating salary for employee ${employee.user.name}:`, error);
    }
  }

  return results;
}

/**
 * Mendapatkan daftar gaji dengan filter
 */
export async function getSalaries(filter: SalaryFilter = {}) {
  const whereCondition: any = {};

  if (filter.employeeId) {
    whereCondition.employeeId = filter.employeeId;
  }

  if (filter.paymentStatus) {
    whereCondition.paymentStatus = filter.paymentStatus;
  }

  if (filter.startDate && filter.endDate) {
    whereCondition.periodStart = {
      gte: filter.startDate,
      lte: filter.endDate
    };
  }

  if (filter.departmentId) {
    whereCondition.employee = {
      departmentId: filter.departmentId
    };
  }

  if (filter.contractType) {
    whereCondition.employee = {
      ...whereCondition.employee,
      contractType: filter.contractType
    };
  }

  return prisma.salary.findMany({
    where: whereCondition,
    include: {
      employee: {
        include: {
          user: { select: { name: true, email: true } },
          department: true,
          position: true
        }
      }
    },
    orderBy: [
      { periodStart: 'desc' },
      { employee: { user: { name: 'asc' } } }
    ]
  });
}

/**
 * Mendapatkan detail gaji berdasarkan ID
 */
export async function getSalaryById(id: string) {
  return prisma.salary.findUnique({
    where: { id },
    include: {
      employee: {
        include: {
          user: { select: { name: true, email: true } },
          department: true,
          position: true,
          employeeAllowances: {
            include: {
              allowanceValue: {
                include: {
                  allowanceType: true
                }
              }
            }
          }
        }
      }
    }
  });
}

/**
 * Update status pembayaran gaji
 */
export async function updatePaymentStatus(id: string, status: PaymentStatus, paymentDate?: Date) {
  return prisma.salary.update({
    where: { id },
    data: {
      paymentStatus: status,
      ...(paymentDate && { updatedAt: paymentDate })
    },
    include: {
      employee: {
        include: {
          user: { select: { name: true } },
          department: true
        }
      }
    }
  });
}

/**
 * Proses pembayaran untuk beberapa gaji sekaligus
 */
export async function processPayments(salaryIds: string[], paymentDate: Date = new Date()) {
  return prisma.salary.updateMany({
    where: {
      id: { in: salaryIds },
      paymentStatus: PaymentStatus.UNPAID
    },
    data: {
      paymentStatus: PaymentStatus.PAID,
      updatedAt: paymentDate
    }
  });
}

/**
 * Mendapatkan statistik gaji
 */
export async function getSalaryStatistics(startDate: Date, endDate: Date) {
  const salaries = await prisma.salary.findMany({
    where: {
      periodStart: {
        gte: startDate,
        lte: endDate
      }
    },
    include: {
      employee: {
        include: {
          department: true
        }
      }
    }
  });

  const stats = {
    totalEmployees: salaries.length,
    totalSalaryAmount: salaries.reduce((sum, salary) => sum + salary.totalSalary, 0),
    paidSalaries: salaries.filter(s => s.paymentStatus === PaymentStatus.PAID).length,
    unpaidSalaries: salaries.filter(s => s.paymentStatus === PaymentStatus.UNPAID).length,
    departmentBreakdown: {} as Record<string, {
      count: number;
      totalAmount: number;
      avgSalary: number;
    }>
  };

  // Hitung breakdown per departemen
  salaries.forEach(salary => {
    const deptName = salary.employee.department.name;
    if (!stats.departmentBreakdown[deptName]) {
      stats.departmentBreakdown[deptName] = {
        count: 0,
        totalAmount: 0,
        avgSalary: 0
      };
    }
    stats.departmentBreakdown[deptName].count++;
    stats.departmentBreakdown[deptName].totalAmount += salary.totalSalary;
  });

  // Hitung rata-rata gaji per departemen
  Object.keys(stats.departmentBreakdown).forEach(dept => {
    const breakdown = stats.departmentBreakdown[dept];
    breakdown.avgSalary = breakdown.totalAmount / breakdown.count;
  });

  return stats;
}

/**
 * Export data gaji ke format Excel/CSV
 */
export async function exportSalaryData(filter: SalaryFilter = {}) {
  const salaries = await getSalaries(filter);

  return salaries.map(salary => ({
    'ID Karyawan': salary.employee.employeeId,
    'Nama Karyawan': salary.employee.user.name,
    'Departemen': salary.employee.department.name,
    'Posisi': salary.employee.position?.name || '-',
    'Periode Mulai': format(salary.periodStart, 'dd/MM/yyyy'),
    'Periode Akhir': format(salary.periodEnd, 'dd/MM/yyyy'),
    'Jam Kerja Utama': salary.mainWorkHours,
    'Jam Lembur Reguler': salary.regularOvertimeHours,
    'Jam Lembur Mingguan': salary.weeklyOvertimeHours,
    'Gaji Pokok': salary.baseSalary,
    'Gaji Lembur': salary.overtimeSalary,
    'Gaji Lembur Mingguan': salary.weeklyOvertimeSalary,
    'Total Tunjangan': salary.totalAllowances,
    'Total Gaji': salary.totalSalary,
    'Status Pembayaran': salary.paymentStatus === PaymentStatus.PAID ? 'Dibayar' : 'Belum Dibayar',
    'Tanggal Dibuat': format(salary.createdAt, 'dd/MM/yyyy HH:mm'),
    'Tanggal Diperbarui': format(salary.updatedAt, 'dd/MM/yyyy HH:mm')
  }));
}

/**
 * Handle contract status change untuk perhitungan gaji otomatis
 */
export async function handleContractStatusChange(employeeId: string, newContractType: ContractType) {
  // Cek apakah ada gaji yang belum dibayar untuk karyawan ini
  const unpaidSalaries = await prisma.salary.findMany({
    where: {
      employeeId,
      paymentStatus: PaymentStatus.UNPAID
    }
  });

  if (unpaidSalaries.length > 0) {
    // Update perhitungan gaji berdasarkan tipe kontrak baru
    for (const salary of unpaidSalaries) {
      const newCalculation = await calculateEmployeeSalary({
        employeeId,
        periodStart: salary.periodStart,
        periodEnd: salary.periodEnd
      });

      // Update data gaji yang belum dibayar
      await prisma.salary.update({
        where: { id: salary.id },
        data: {
          baseSalary: newCalculation.baseSalary,
          overtimeSalary: newCalculation.overtimeSalary,
          weeklyOvertimeSalary: newCalculation.weeklyOvertimeSalary,
          totalAllowances: newCalculation.totalAllowances,
          totalSalary: newCalculation.totalSalary,
          updatedAt: new Date()
        }
      });
    }

    console.log(`Updated ${unpaidSalaries.length} unpaid salaries for employee ${employeeId} due to contract change`);
  }
} 