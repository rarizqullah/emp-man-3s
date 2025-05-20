import prisma from '@/lib/db/prisma';
import { Prisma, ContractType, WarningStatus } from '@prisma/client';

// Tipe data untuk parameter employee baru
export interface EmployeeCreateInput {
  userId: string;
  employeeId: string;
  departmentId: string;
  subDepartmentId?: string;
  shiftId: string;
  contractType: ContractType;
  contractNumber?: string;
  contractStartDate: Date;
  contractEndDate?: Date;
  warningStatus?: WarningStatus;
  faceData?: string;
}

// Tipe data untuk update employee
export interface EmployeeUpdateInput {
  departmentId?: string;
  subDepartmentId?: string | null;
  shiftId?: string;
  contractType?: ContractType;
  contractNumber?: string | null;
  contractStartDate?: Date;
  contractEndDate?: Date | null;
  warningStatus?: WarningStatus;
  faceData?: string | null;
}

// Get semua karyawan dengan relasi
export async function getAllEmployees() {
  return prisma.employee.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        }
      },
      department: true,
      subDepartment: true,
      shift: true,
    },
  });
}

// Get karyawan berdasarkan ID
export async function getEmployeeById(id: string) {
  try {
    console.log(`getEmployeeById dipanggil untuk ID: ${id}`);
    
    if (!id) {
      throw new Error('ID karyawan tidak diberikan ke getEmployeeById');
    }
    
    try {
      console.log(`Menjalankan query untuk karyawan dengan ID: ${id}`);
      
      // Memastikan koneksi database sebelum query
      const { ensureDatabaseConnection } = await import('@/lib/db/prisma');
      await ensureDatabaseConnection();
      
      // Query untuk mendapatkan data karyawan dengan relasi user langsung
      const employeeData = await prisma.employee.findUnique({
        where: { id },
        include: {
          department: true,
          subDepartment: true,
          position: {
            select: {
              id: true,
              name: true,
              description: true,
              level: true,
              createdAt: true,
              updatedAt: true
            }
          },
          shift: {
            select: {
              id: true,
              name: true,
              shiftType: true,
              mainWorkStart: true,
              mainWorkEnd: true,
              lunchBreakStart: true,
              lunchBreakEnd: true,
              regularOvertimeStart: true,
              regularOvertimeEnd: true,
              weeklyOvertimeStart: true,
              weeklyOvertimeEnd: true,
              subDepartmentId: true,
              createdAt: true,
              updatedAt: true
            }
          },
          // Langsung ambil data user dari relasi
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          }
        },
      });
      
      if (!employeeData) {
        console.log(`Karyawan dengan ID ${id} tidak ditemukan`);
        return null;
      }
      
      // Data sudah termasuk informasi user, tidak perlu query tambahan
      console.log(`Hasil query getEmployeeById: Data ditemukan`);
      
      return employeeData;
    } catch (dbError) {
      console.error("Database error in getEmployeeById:", dbError);
      console.error("Trace:", new Error().stack);
      
      // Coba cek apakah ini adalah error koneksi
      const errorMessage = String(dbError).toLowerCase();
      if (
        errorMessage.includes('connection') &&
        (errorMessage.includes('reset') || 
         errorMessage.includes('closed') || 
         errorMessage.includes('timeout'))
      ) {
        console.log('Terdeteksi error koneksi database, mencoba menyambungkan kembali...');
        
        // Tunggu sebentar dan coba import ulang untuk merefresh koneksi
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Coba refresh koneksi database
        const { ensureDatabaseConnection } = await import('@/lib/db/prisma');
        const reconnected = await ensureDatabaseConnection();
        
        if (reconnected) {
          console.log("Berhasil menyambungkan kembali ke database, mencoba query ulang");
          // Coba query ulang setelah koneksi diperbaiki
          return getEmployeeById(id);
        }
      }
      
      throw new Error(`Database error: ${dbError instanceof Error ? dbError.message : String(dbError)}`);
    }
  } catch (error) {
    console.error("Error di getEmployeeById:", error);
    console.error("Stack trace:", error instanceof Error ? error.stack : "No stack trace available");
    throw error;
  }
}

// Get karyawan berdasarkan userID
export async function getEmployeeByUserId(userId: string) {
  return prisma.employee.findFirst({
    where: { userId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        }
      },
      department: true,
      subDepartment: true,
      shift: true,
    },
  });
}

// Get karyawan berdasarkan employeeId
export async function getEmployeeByEmployeeId(employeeId: string) {
  return prisma.employee.findFirst({
    where: { employeeId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        }
      },
      department: true,
      subDepartment: true,
      shift: true,
    },
  });
}

// Membuat karyawan baru
export async function createEmployee(data: EmployeeCreateInput) {
  return prisma.employee.create({
    data: {
      user: { connect: { id: data.userId } },
      employeeId: data.employeeId,
      department: { connect: { id: data.departmentId } },
      subDepartment: data.subDepartmentId
        ? { connect: { id: data.subDepartmentId } }
        : undefined,
      shift: { connect: { id: data.shiftId } },
      contractType: data.contractType,
      contractNumber: data.contractNumber,
      contractStartDate: data.contractStartDate,
      contractEndDate: data.contractEndDate,
      warningStatus: data.warningStatus || WarningStatus.NONE,
      faceData: data.faceData,
    },
    include: {
      user: true,
      department: true,
      subDepartment: true,
      shift: true,
    },
  });
}

// Update karyawan
export async function updateEmployee(id: string, data: EmployeeUpdateInput) {
  const updateData: Prisma.EmployeeUpdateInput = {};

  if (data.departmentId) {
    updateData.department = { connect: { id: data.departmentId } };
  }

  if (data.subDepartmentId === null) {
    updateData.subDepartment = { disconnect: true };
  } else if (data.subDepartmentId) {
    updateData.subDepartment = { connect: { id: data.subDepartmentId } };
  }

  if (data.shiftId) {
    updateData.shift = { connect: { id: data.shiftId } };
  }

  if (data.contractType) {
    updateData.contractType = data.contractType;
  }

  if (data.contractNumber !== undefined) {
    updateData.contractNumber = data.contractNumber;
  }

  if (data.contractStartDate) {
    updateData.contractStartDate = data.contractStartDate;
  }

  if (data.contractEndDate === null) {
    updateData.contractEndDate = null;
  } else if (data.contractEndDate) {
    updateData.contractEndDate = data.contractEndDate;
  }

  if (data.warningStatus) {
    updateData.warningStatus = data.warningStatus;
  }

  if (data.faceData !== undefined) {
    updateData.faceData = data.faceData;
  }

  return prisma.employee.update({
    where: { id },
    data: updateData,
    include: {
      user: true,
      department: true,
      subDepartment: true,
      shift: true,
    },
  });
}

// Hapus karyawan
export async function deleteEmployee(id: string) {
  return prisma.employee.delete({
    where: { id },
  });
}

// Update shift karyawan
export async function updateEmployeeShift(id: string, shiftId: string) {
  return prisma.employee.update({
    where: { id },
    data: { shiftId },
  });
}

// Update jabatan karyawan
export async function updateEmployeePosition(id: string, positionId: string) {
  return prisma.employee.update({
    where: { id },
    data: { positionId },
  });
}

// Update status peringatan (SP) karyawan
export async function updateEmployeeWarningStatus(id: string, warningStatus: WarningStatus) {
  return prisma.employee.update({
    where: { id },
    data: { warningStatus },
  });
}

// Update data wajah karyawan
export async function updateEmployeeFaceData(id: string, faceData: string) {
  return prisma.employee.update({
    where: { id },
    data: { faceData },
  });
}

// Update kontrak karyawan
export async function updateEmployeeContract(
  id: string,
  data: {
    contractType: ContractType;
    contractNumber?: string | null;
    contractStartDate?: Date;
    contractEndDate?: Date | null;
  }
) {
  return prisma.employee.update({
    where: { id },
    data,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        }
      },
      department: true,
      subDepartment: true,
      shift: true,
      position: true
    },
  });
}

// Cari karyawan berdasarkan nama atau departemen
export async function searchEmployees(keyword: string) {
  return prisma.employee.findMany({
    where: {
      OR: [
        { employeeId: { contains: keyword, mode: 'insensitive' } },
        { user: { name: { contains: keyword, mode: 'insensitive' } } },
        { user: { email: { contains: keyword, mode: 'insensitive' } } },
        { department: { name: { contains: keyword, mode: 'insensitive' } } },
        { subDepartment: { name: { contains: keyword, mode: 'insensitive' } } },
      ],
    },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          role: true,
        },
      },
      department: true,
      subDepartment: true,
      shift: true,
    },
  });
}

// Dapatkan karyawan yang kontraknya akan berakhir dalam N hari
export async function getEmployeesWithExpiringContracts(daysThreshold: number) {
  const today = new Date();
  const thresholdDate = new Date();
  thresholdDate.setDate(today.getDate() + daysThreshold);

  return prisma.employee.findMany({
    where: {
      contractEndDate: {
        lte: thresholdDate,
        gt: today,
      },
    },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      department: true,
      position: true,
    },
  });
}

// Dapatkan karyawan dengan data wajah untuk face recognition
export async function getEmployeesWithFaceData() {
  return prisma.employee.findMany({
    where: {
      faceData: {
        not: null
      }
    },
    select: {
      id: true,
      employeeId: true,
      faceData: true,
      user: {
        select: {
          name: true
        }
      }
    }
  });
}

// Menyimpan data wajah karyawan
export async function saveFaceData(id: string, faceData: string) {
  return prisma.employee.update({
    where: { id },
    data: {
      faceData
    }
  });
}