import { prisma } from '@/lib/db';
import { Prisma, ContractType, WarningStatus, Gender } from '@prisma/client';

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
  bankAccountNumber?: string;
  faceData?: string;
}

// Tipe data untuk update employee - UPDATED untuk mendukung field user
export interface EmployeeUpdateInput {
  // User data - TAMBAHAN BARU
  name?: string;
  email?: string;
  phone?: string | null;
  
  // Employee data (yang sudah ada)
  departmentId?: string;
  subDepartmentId?: string | null;
  positionId?: string | null; // Tambahkan positionId yang hilang
  shiftId?: string;
  contractType?: ContractType;
  contractNumber?: string | null;
  contractStartDate?: Date;
  contractEndDate?: Date | null;
  warningStatus?: WarningStatus;
  gender?: Gender; // Tambahkan gender yang hilang
  address?: string | null; // Tambahkan address yang hilang
  bankAccountNumber?: string | null; // Tambahkan nomor rekening
  faceData?: string | null;
}

// Get semua karyawan dengan relasi
export async function getAllEmployees() {
  try {
    // Pastikan koneksi database tersedia
    const { ensureDatabaseConnection } = await import('@/lib/db');
    const isConnected = await ensureDatabaseConnection();
    
    if (!isConnected) {
      throw new Error('Tidak dapat terhubung ke database');
    }

    // Validasi koneksi dengan $connect()
    await prisma.$connect();

    // Gunakan select fields yang spesifik untuk mengurangi beban query - hanya karyawan aktif
    const employees = await prisma.employee.findMany({
      where: {
        deletedAt: null // Filter hanya karyawan yang tidak diarsipkan
      },
      select: {
        id: true,
        employeeId: true,
        departmentId: true,
        subDepartmentId: true,
        positionId: true,
        shiftId: true,
        contractType: true,
        contractNumber: true,
        contractStartDate: true,
        contractEndDate: true,
        warningStatus: true,
        gender: true,
        address: true,
        bankAccountNumber: true,
        faceData: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
          }
        },
        department: {
          select: {
            id: true,
            name: true,
          }
        },
        subDepartment: {
          select: {
            id: true,
            name: true,
          }
        },
        position: {
          select: {
            id: true,
            name: true,
            level: true,
          }
        },
        shift: {
          select: {
            id: true,
            name: true,
            shiftType: true,
          }
        },
      },
    });

    return employees;
  } catch (error) {
    console.error('Error dalam getAllEmployees:', error);
    
    // Check jika ini adalah error koneksi
    const errorMessage = String(error).toLowerCase();
    if (
      errorMessage.includes('connection') &&
      (errorMessage.includes('reset') || 
       errorMessage.includes('closed') || 
       errorMessage.includes('timeout') ||
       errorMessage.includes('p1017'))
    ) {
      console.log('Terdeteksi error koneksi database, mencoba menyambungkan kembali...');
      
      // Tunggu sebentar dan coba koneksi ulang
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      try {
        const { ensureDatabaseConnection } = await import('@/lib/db');
        const reconnected = await ensureDatabaseConnection();
        
        if (reconnected) {
          console.log("Berhasil menyambungkan kembali ke database, mencoba query ulang");
          
          // Regenerate Prisma client jika perlu
          await prisma.$disconnect();
          await prisma.$connect();
          
          // Retry query dengan timeout yang lebih pendek - hanya karyawan aktif
          return await prisma.employee.findMany({
            where: {
              deletedAt: null // Filter hanya karyawan yang tidak diarsipkan
            },
            select: {
              id: true,
              employeeId: true,
              departmentId: true,
              subDepartmentId: true,
              positionId: true,
              shiftId: true,
              contractType: true,
              contractNumber: true,
              contractStartDate: true,
              contractEndDate: true,
              warningStatus: true,
              gender: true,
              address: true,
              bankAccountNumber: true,
              faceData: true,
              createdAt: true,
              updatedAt: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                }
              },
              department: {
                select: {
                  id: true,
                  name: true,
                }
              },
              subDepartment: {
                select: {
                  id: true,
                  name: true,
                }
              },
              position: {
                select: {
                  id: true,
                  name: true,
                  level: true,
                }
              },
              shift: {
                select: {
                  id: true,
                  name: true,
                  shiftType: true,
                }
              },
            },
          });
        }
      } catch (retryError) {
        console.error('Gagal melakukan retry koneksi:', retryError);
      }
    }
    
    throw error;
  }
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
      
      // Memastikan koneksi database sebelum query dengan timeout yang diperpanjang
      const { ensureDatabaseConnection } = await import('@/lib/db');
      
      // Extended connection timeout untuk stability
      const connectionResult = await Promise.race([
        ensureDatabaseConnection(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database connection timeout in getEmployeeById')), 5000)
        )
      ]);
      
      if (!connectionResult) {
        throw new Error('Gagal memastikan koneksi database');
      }
      
      // Optimized query dengan reduced field selection untuk mengurangi load
      const employeeData = await Promise.race([
        prisma.employee.findUnique({
          where: { id },
          select: {
            // Core employee fields
            id: true,
            employeeId: true,
            departmentId: true,
            subDepartmentId: true,
            positionId: true,
            shiftId: true,
            userId: true,
            contractType: true,
            contractNumber: true,
            contractStartDate: true,
            contractEndDate: true,
            warningStatus: true,
            gender: true,
            address: true,
            bankAccountNumber: true,
            faceData: true,
            createdAt: true,
            updatedAt: true,
            
            // Related data with minimal fields untuk performance
            department: {
              select: {
                id: true,
                name: true,
              }
            },
            subDepartment: {
              select: {
                id: true,
                name: true,
                departmentId: true,
              }
            },
            position: {
              select: {
                id: true,
                name: true,
                description: true,
                level: true,
              }
            },
            // Simplified shift query dengan hanya field essential
            shift: {
              select: {
                id: true,
                name: true,
                shiftType: true,
                // Reduced field set untuk performance
                mainWorkStart: true,
                mainWorkEnd: true,
                lunchBreakStart: true,
                lunchBreakEnd: true,
                regularOvertimeStart: true,
                regularOvertimeEnd: true,
                workingDays: true,
              }
            },
            // User data with selected fields only
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true, // Tambahkan field phone
                role: true
              }
            }
          },
        }),
        // Extended timeout untuk complex queries - 30 detik untuk mengurangi timeout error
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Employee query timeout in getEmployeeById')), 30000)
        )
      ]);
      
      if (!employeeData) {
        console.log(`Karyawan dengan ID ${id} tidak ditemukan`);
        return null;
      }
      
      console.log(`Hasil query getEmployeeById: Data ditemukan dan diproses`);
      
      return employeeData;
    } catch (dbError) {
      console.error("Database error in getEmployeeById:", dbError);
      console.error("Error detail:", String(dbError));
      
      // Enhanced error handling untuk timeout
      const errorMessage = String(dbError).toLowerCase();
      
      if (errorMessage.includes('timeout')) {
        console.log('Query timeout terdeteksi di getEmployeeById');
        // Coba minimal query fallback sebelum fail
        try {
          console.log('Mencoba minimal query fallback...');
          
          const minimalData = await Promise.race([
            prisma.employee.findUnique({
              where: { id },
              select: {
                id: true,
                employeeId: true,
                departmentId: true,
                subDepartmentId: true,
                positionId: true,
                shiftId: true,
                userId: true,
                contractType: true,
                contractNumber: true,
                contractStartDate: true,
                contractEndDate: true,
                warningStatus: true,
                gender: true,
                address: true,
                faceData: true,
                createdAt: true,
                updatedAt: true,
                // Minimal relational data
                department: { select: { id: true, name: true } },
                subDepartment: { select: { id: true, name: true, departmentId: true } },
                position: { select: { id: true, name: true, level: true } },
                shift: { select: { id: true, name: true, shiftType: true } },
                user: { select: { id: true, name: true, email: true, phone: true, role: true } }
              },
            }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Minimal query timeout')), 15000)
            )
          ]);
          
          if (minimalData) {
            console.log('Minimal query berhasil, mengembalikan data dasar');
            return minimalData;
          }
        } catch (fallbackError) {
          console.error('Minimal query juga gagal:', fallbackError);
        }
        
        throw new Error(`Query timeout saat mengambil data karyawan: ${id}`);
      }
      
      // Check untuk error yang terkait dengan field baru
      if (errorMessage.includes('column') || errorMessage.includes('field') || errorMessage.includes('property')) {
        console.log('Schema compatibility error detected, trying basic fallback query...');
        
        try {
          // Ultra-basic fallback query tanpa optional fields
          const basicData = await prisma.employee.findUnique({
            where: { id },
            select: {
              id: true,
              employeeId: true,
              departmentId: true,
              subDepartmentId: true,
              positionId: true,
              shiftId: true,
              userId: true,
              contractType: true,
              contractNumber: true,
              contractStartDate: true,
              contractEndDate: true,
              warningStatus: true,
              gender: true,
              address: true,
              faceData: true,
              createdAt: true,
              updatedAt: true,
              department: { select: { id: true, name: true } },
              subDepartment: { select: { id: true, name: true } },
              position: { select: { id: true, name: true } },
              shift: { select: { id: true, name: true, shiftType: true } },
              user: { select: { id: true, name: true, email: true, role: true } }
            },
          });
          
          if (basicData) {
            console.log('Basic fallback query berhasil');
            return basicData;
          }
        } catch (basicError) {
          console.error('Basic fallback query juga gagal:', basicError);
        }
      }
      
      // Coba cek apakah ini adalah error koneksi
      if (
        errorMessage.includes('connection') &&
        (errorMessage.includes('reset') || 
         errorMessage.includes('closed') || 
         errorMessage.includes('refused') ||
         errorMessage.includes('p1017'))
      ) {
        console.log('Terdeteksi error koneksi database, mencoba retry sekali...');
        
        try {
          // Tunggu sebentar untuk stabilitas
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Coba refresh koneksi database
          const { ensureDatabaseConnection } = await import('@/lib/db');
          const reconnected = await ensureDatabaseConnection();
          
          if (reconnected) {
            console.log("Berhasil menyambungkan kembali ke database, mencoba query ulang");
            
            // Retry dengan query simplified dan timeout yang lebih ketat
            return await Promise.race([
              prisma.employee.findUnique({
                where: { id },
                select: {
                  id: true,
                  employeeId: true,
                  departmentId: true,
                  subDepartmentId: true,
                  positionId: true,
                  shiftId: true,
                  userId: true,
                  contractType: true,
                  contractNumber: true,
                  contractStartDate: true,
                  contractEndDate: true,
                  warningStatus: true,
                  gender: true,
                  address: true,
                  faceData: true,
                  createdAt: true,
                  updatedAt: true,
                  department: { select: { id: true, name: true } },
                  subDepartment: { select: { id: true, name: true, departmentId: true } },
                  position: { select: { id: true, name: true, level: true } },
                  shift: { select: { id: true, name: true, shiftType: true } },
                  user: { select: { id: true, name: true, email: true, role: true } }
                },
              }),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Retry query timeout')), 10000)
              )
            ]);
          }
        } catch (retryError) {
          console.error('Gagal melakukan retry koneksi:', retryError);
          throw new Error(`Database connection retry failed: ${String(retryError)}`);
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
  // Gunakan transaction untuk update user dan employee secara terpisah
  return await prisma.$transaction(async (tx) => {
    // 1. Get employee dengan user data
    const employee = await tx.employee.findUnique({
      where: { id },
      include: { user: true }
    });
    
    if (!employee) {
      throw new Error('Employee not found');
    }
    
    // 2. Update user data jika ada
    const userUpdateData: any = {};
    if (data.name !== undefined) userUpdateData.name = data.name;
    if (data.email !== undefined) userUpdateData.email = data.email;
    if (data.phone !== undefined) userUpdateData.phone = data.phone;
    
    if (Object.keys(userUpdateData).length > 0) {
      await tx.user.update({
        where: { id: employee.userId },
        data: userUpdateData
      });
    }
    
    // 3. Update employee data
    const employeeUpdateData: Prisma.EmployeeUpdateInput = {};
    
    if (data.departmentId) {
      employeeUpdateData.department = { connect: { id: data.departmentId } };
    }
    
    if (data.subDepartmentId === null) {
      employeeUpdateData.subDepartment = { disconnect: true };
    } else if (data.subDepartmentId) {
      employeeUpdateData.subDepartment = { connect: { id: data.subDepartmentId } };
    }
    
    if (data.positionId === null) {
      employeeUpdateData.position = { disconnect: true };
    } else if (data.positionId) {
      employeeUpdateData.position = { connect: { id: data.positionId } };
    }
    
    if (data.shiftId) {
      employeeUpdateData.shift = { connect: { id: data.shiftId } };
    }
    
    if (data.contractType) {
      employeeUpdateData.contractType = data.contractType;
    }
    
    if (data.contractNumber !== undefined) {
      employeeUpdateData.contractNumber = data.contractNumber;
    }
    
    if (data.contractStartDate) {
      employeeUpdateData.contractStartDate = data.contractStartDate;
    }
    
    if (data.contractEndDate === null) {
      employeeUpdateData.contractEndDate = null;
    } else if (data.contractEndDate) {
      employeeUpdateData.contractEndDate = data.contractEndDate;
    }
    
    if (data.warningStatus) {
      employeeUpdateData.warningStatus = data.warningStatus;
    }
    
    if (data.gender) {
      employeeUpdateData.gender = data.gender;
    }
    
    if (data.address !== undefined) {
      employeeUpdateData.address = data.address;
    }
    
    if (data.bankAccountNumber !== undefined) {
      employeeUpdateData.bankAccountNumber = data.bankAccountNumber;
    }
    
    if (data.faceData !== undefined) {
      employeeUpdateData.faceData = data.faceData;
    }
    
    // Update employee
    const updatedEmployee = await tx.employee.update({
      where: { id },
      data: employeeUpdateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
          }
        },
        department: true,
        subDepartment: true,
        position: true,
        shift: true,
      },
    });
    
    return updatedEmployee;
  });
}

// Hapus karyawan
export async function deleteEmployee(id: string) {
  try {
    console.log(`deleteEmployee dipanggil untuk ID: ${id}`);
    
    if (!id) {
      throw new Error('ID karyawan tidak diberikan untuk delete');
    }
    
    // Pastikan karyawan ada sebelum delete
    const existingEmployee = await prisma.employee.findUnique({
      where: { id },
      include: {
        user: true,
        attendances: true,
        contractHistory: true,
        shiftHistory: true,
        warningHistory: true,
        salaries: true, // Include salary data for validation
        employeeAllowances: true, // Include allowance data for validation
      }
    });
    
    if (!existingEmployee) {
      throw new Error(`Karyawan dengan ID ${id} tidak ditemukan`);
    }
    
    console.log(`Karyawan ditemukan: ${existingEmployee.user?.name || 'Unknown'}, melakukan validasi data terkait...`);
    
    // VALIDASI: Cek apakah karyawan masih memiliki data gaji
    if (existingEmployee.salaries && existingEmployee.salaries.length > 0) {
      const unpaidSalaries = existingEmployee.salaries.filter(salary => salary.paymentStatus === 'UNPAID');
      const totalSalaries = existingEmployee.salaries.length;
      
      if (unpaidSalaries.length > 0) {
        console.log(`Karyawan ${existingEmployee.user?.name || 'Unknown'} memiliki ${unpaidSalaries.length} data gaji yang belum dibayar`);
        throw new Error(`Karyawan tidak dapat dihapus karena masih memiliki ${unpaidSalaries.length} data gaji yang belum dibayar (UNPAID). Silakan proses pembayaran gaji terlebih dahulu atau hapus data gaji dari menu Penggajian.`);
      }
      
      if (totalSalaries > 0) {
        console.log(`Karyawan ${existingEmployee.user?.name || 'Unknown'} memiliki ${totalSalaries} data gaji yang sudah dibayar`);
        throw new Error(`Karyawan tidak dapat dihapus karena masih memiliki ${totalSalaries} data riwayat gaji. Silakan hapus semua data gaji terlebih dahulu dari menu Penggajian untuk menjaga integritas data keuangan.`);
      }
    }
    
    // VALIDASI: Cek apakah karyawan masih memiliki data tunjangan
    if (existingEmployee.employeeAllowances && existingEmployee.employeeAllowances.length > 0) {
      const allowanceCount = existingEmployee.employeeAllowances.length;
      console.log(`Karyawan ${existingEmployee.user?.name || 'Unknown'} memiliki ${allowanceCount} data tunjangan`);
      throw new Error(`Karyawan tidak dapat dihapus karena masih memiliki ${allowanceCount} data tunjangan yang terkait. Silakan hapus data tunjangan terlebih dahulu dari menu Konfigurasi.`);
    }
    
    console.log(`Validasi data terkait berhasil, memulai proses delete...`);
    
    // Gunakan transaction untuk memastikan data consistency
    const result = await prisma.$transaction(async (tx) => {
      // 1. Hapus semua attendance records
      if (existingEmployee.attendances && existingEmployee.attendances.length > 0) {
        console.log(`Menghapus ${existingEmployee.attendances.length} attendance records...`);
        await tx.attendance.deleteMany({
          where: { employeeId: id }
        });
      }
      
      // 2. Hapus semua contract history
      if (existingEmployee.contractHistory && existingEmployee.contractHistory.length > 0) {
        console.log(`Menghapus ${existingEmployee.contractHistory.length} contract history records...`);
        await tx.contractHistory.deleteMany({
          where: { employeeId: id }
        });
      }
      
      // 3. Hapus semua shift history
      if (existingEmployee.shiftHistory && existingEmployee.shiftHistory.length > 0) {
        console.log(`Menghapus ${existingEmployee.shiftHistory.length} shift history records...`);
        await tx.shiftHistory.deleteMany({
          where: { employeeId: id }
        });
      }
      
      // 4. Hapus semua warning history
      if (existingEmployee.warningHistory && existingEmployee.warningHistory.length > 0) {
        console.log(`Menghapus ${existingEmployee.warningHistory.length} warning history records...`);
        await tx.warningHistory.deleteMany({
          where: { employeeId: id }
        });
      }
      
      // 5. Hapus employee record
      console.log(`Menghapus employee record...`);
      const deletedEmployee = await tx.employee.delete({
        where: { id },
      });
      
      console.log(`Employee ${existingEmployee.user?.name || 'Unknown'} berhasil dihapus`);
      return deletedEmployee;
    });
    
    return result;
  } catch (error) {
    console.error('Error dalam deleteEmployee:', error);
    
    const errorMessage = String(error).toLowerCase();
    
    // Handle salary/allowance validation errors (user-friendly messages)
    if (error instanceof Error && (
      error.message.includes('data gaji') ||
      error.message.includes('data tunjangan') ||
      error.message.includes('belum dibayar') ||
      error.message.includes('riwayat gaji')
    )) {
      throw error; // Re-throw validation errors as-is (already user-friendly)
    }
    
    // Handle specific database errors
    if (errorMessage.includes('foreign key constraint')) {
      throw new Error('Tidak dapat menghapus karyawan karena masih memiliki data terkait. Silakan hapus data terkait terlebih dahulu.');
    }
    
    if (errorMessage.includes('record to delete does not exist') || errorMessage.includes('not found')) {
      throw new Error('Karyawan tidak ditemukan atau sudah dihapus sebelumnya.');
    }
    
    if (errorMessage.includes('connection') && (
      errorMessage.includes('reset') || 
      errorMessage.includes('closed') || 
      errorMessage.includes('timeout') ||
      errorMessage.includes('p1017')
    )) {
      throw new Error('Masalah koneksi database. Silakan coba lagi dalam beberapa saat.');
    }
    
    // Generic error
    throw new Error(`Gagal menghapus karyawan: ${error instanceof Error ? error.message : String(error)}`);
  }
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