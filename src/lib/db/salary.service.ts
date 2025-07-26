import { prisma } from '@/lib/db';
import { ContractType, PaymentStatus } from '@prisma/client';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

// Interface untuk employee dengan bank account
interface EmployeeWithBankAccount {
  id: string;
  employeeId: string;
  contractType: string;
  bankAccountNumber?: string | null;
  user: {
    name: string;
    email: string;
  };
  department: {
    id: string;
    name: string;
  };
  position?: {
    id: string;
    name: string;
  } | null;
  employeeAllowances: EmployeeAllowanceWithDetails[];
}

// Interface untuk employee allowance dengan detail
interface EmployeeAllowanceWithDetails {
  allowance: {
    id: string;
    name: string;
    description: string | null;
    applicableRule: string;
    umkAmount: number | null;
    companyPercentage: number | null;
    companyAmount: number | null;
    employeePercentage: number | null;
    employeeAmount: number | null;
    createdAt: Date;
    updatedAt: Date;
  };
  id: string;
  employeeId: string;
  allowanceId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Fungsi untuk membulatkan nominal gaji ke kelipatan 100 terdekat
 * Aturan pembulatan:
 * - 20.360 → 20.400 (60 dibulatkan ke atas menjadi 100)
 * - 20.320 → 20.300 (20 dibulatkan ke bawah menjadi 0)
 * - 20.350 → 20.400 (50 dibulatkan ke atas menjadi 100)
 * 
 * Logika: Jika dua digit terakhir >= 50, bulatkan ke atas, jika < 50 bulatkan ke bawah
 */
function roundSalaryToNearestHundred(amount: number): number {
  const remainder = amount % 100;
  
  if (remainder >= 50) {
    // Bulatkan ke atas ke kelipatan 100 berikutnya
    return Math.ceil(amount / 100) * 100;
  } else {
    // Bulatkan ke bawah ke kelipatan 100 sebelumnya
    return Math.floor(amount / 100) * 100;
  }
}

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
  employee?: unknown;
  allowances?: Array<{ type: string; value: number }>;
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
          allowance: true
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

  // Filter tunjangan yang aktif (hanya check employee allowance active status)
  const activeAllowances = employee.employeeAllowances.filter(ea => 
    ea.isActive
  );

  // Hitung total tunjangan perusahaan (tambahan)
  const totalCompanyAllowances = activeAllowances.reduce((total, empAllowance) => {
    return total + (empAllowance.allowance.companyAmount || 0);
  }, 0);

  // Hitung total potongan tunjangan karyawan (dikurangi dari gaji)
  const totalEmployeeAllowanceDeductions = activeAllowances.reduce((total, empAllowance) => {
    return total + (empAllowance.allowance.employeeAmount || 0);
  }, 0);

  // Hitung total gaji (gaji pokok + lembur + tunjangan perusahaan - potongan tunjangan karyawan)
  const totalSalary = baseSalary + overtimeSalary + weeklyOvertimeSalary + totalCompanyAllowances - totalEmployeeAllowanceDeductions;

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
    totalAllowances: Math.round(totalCompanyAllowances - totalEmployeeAllowanceDeductions),
    totalSalary: roundSalaryToNearestHundred(totalSalary),
    employee,
    allowances: activeAllowances.map(empAllowance => ({
      type: empAllowance.allowance.name,
      value: empAllowance.allowance.companyAmount || 0,
      deduction: empAllowance.allowance.employeeAmount || 0
    }))
  };
}

/**
 * Menyimpan hasil perhitungan gaji ke database
 */
export async function saveSalaryCalculation(calculation: SalaryCalculationResult): Promise<unknown> {
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
export async function generateSalariesForPeriod(periodStart: Date, periodEnd: Date, departmentId?: string): Promise<unknown[]> {
  // Ambil daftar karyawan yang aktif (kontrak belum berakhir atau tidak ada tanggal berakhir)
  const whereCondition: Record<string, unknown> = {
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
  const whereCondition: Record<string, unknown> = {};

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
    if (whereCondition.employee && typeof whereCondition.employee === 'object') {
      whereCondition.employee = {
        ...whereCondition.employee,
        contractType: filter.contractType
      };
    } else {
      whereCondition.employee = {
        contractType: filter.contractType
      };
    }
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
  const salary = await prisma.salary.findUnique({
    where: { id },
    include: {
      employee: {
        include: {
          user: { select: { name: true, email: true } },
          department: true,
          position: true,
          employeeAllowances: {
            include: {
              allowance: true
            }
          }
        }
      }
    }
  });
  
  return salary;
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
    'NIK': salary.employee.employeeId, // Changed from 'ID Karyawan' to 'NIK'
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
 * Export slip gaji individual ke format PDF dengan detail lengkap
 */
export async function exportSalarySlipPDF(salaryId: string) {
  const salary = await getSalaryById(salaryId);
  
  if (!salary) {
    throw new Error('Data gaji tidak ditemukan');
  }

  // Return data formatted untuk PDF dengan detail lengkap
  return {
    employee: {
      employeeId: salary.employee.employeeId, // NIK
      name: salary.employee.user.name,
      email: salary.employee.user.email,
      department: salary.employee.department.name,
      position: salary.employee.position?.name || '-',
      contractType: salary.employee.contractType === 'PERMANENT' ? 'Permanen' : 'Training',
      bankAccountNumber: (salary.employee as EmployeeWithBankAccount).bankAccountNumber || '-'
    },
    period: {
      start: format(salary.periodStart, 'dd MMMM yyyy', { locale: localeId }),
      end: format(salary.periodEnd, 'dd MMMM yyyy', { locale: localeId }),
      month: format(salary.periodStart, 'MMMM yyyy', { locale: localeId }),
      year: format(salary.periodStart, 'yyyy', { locale: localeId })
    },
    workHours: {
      mainHours: salary.mainWorkHours,
      regularOvertimeHours: salary.regularOvertimeHours,
      weeklyOvertimeHours: salary.weeklyOvertimeHours,
      totalHours: salary.mainWorkHours + salary.regularOvertimeHours + salary.weeklyOvertimeHours
    },
    earnings: {
      baseSalary: salary.baseSalary,
      overtimeSalary: salary.overtimeSalary,
      weeklyOvertimeSalary: salary.weeklyOvertimeSalary,
      totalAllowances: salary.totalAllowances,
      grossSalary: salary.baseSalary + salary.overtimeSalary + salary.weeklyOvertimeSalary + salary.totalAllowances
    },
    earningsDetails: {
      baseSalary: {
        hours: salary.mainWorkHours,
        rate: salary.mainWorkHours > 0 ? Math.round(salary.baseSalary / salary.mainWorkHours) : 0,
        amount: salary.baseSalary
      },
      regularOvertime: {
        hours: salary.regularOvertimeHours,
        rate: salary.regularOvertimeHours > 0 ? Math.round(salary.overtimeSalary / salary.regularOvertimeHours) : 0,
        amount: salary.overtimeSalary
      },
      weeklyOvertime: {
        hours: salary.weeklyOvertimeHours,
        rate: salary.weeklyOvertimeHours > 0 ? Math.round(salary.weeklyOvertimeSalary / salary.weeklyOvertimeHours) : 0,
        amount: salary.weeklyOvertimeSalary
      }
    },
    allowances: salary.employee.employeeAllowances?.map((empAllowance: EmployeeAllowanceWithDetails) => ({
      type: empAllowance.allowance.name,
      companyAmount: empAllowance.allowance.companyAmount || 0,
      employeeAmount: empAllowance.allowance.employeeAmount || 0,
      netAmount: (empAllowance.allowance.companyAmount || 0) - (empAllowance.allowance.employeeAmount || 0)
    })) || [],
    netSalary: salary.totalSalary,
    paymentStatus: salary.paymentStatus === PaymentStatus.PAID ? 'Dibayar' : 'Belum Dibayar',
    paymentDate: salary.paymentStatus === PaymentStatus.PAID ? format(salary.updatedAt, 'dd MMMM yyyy', { locale: localeId }) : null,
    dates: {
      created: format(salary.createdAt, 'dd MMMM yyyy HH:mm', { locale: localeId }),
      updated: format(salary.updatedAt, 'dd MMMM yyyy HH:mm', { locale: localeId })
    },
    // Format currency untuk display
    formatted: {
      baseSalary: new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(salary.baseSalary),
      overtimeSalary: new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(salary.overtimeSalary),
      weeklyOvertimeSalary: new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(salary.weeklyOvertimeSalary),
      totalAllowances: new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(salary.totalAllowances),
      grossSalary: new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(salary.baseSalary + salary.overtimeSalary + salary.weeklyOvertimeSalary + salary.totalAllowances),
      totalSalary: new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(salary.totalSalary)
    }
  };
}

/**
 * Handle contract status change untuk perhitungan gaji otomatis
 */
export async function handleContractStatusChange(employeeId: string) {
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