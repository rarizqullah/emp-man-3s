import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { 
  getAllEmployees, 
} from '@/lib/db/employee.service';
import { ContractType, WarningStatus, Gender } from '@prisma/client';
import prisma from '@/lib/db/prisma';

// Schema validasi untuk membuat karyawan baru
const employeeCreateSchema = z.object({
  userId: z.string().uuid(),
  employeeId: z.string().min(1, "ID Karyawan wajib diisi"),
  departmentId: z.string().uuid(),
  subDepartmentId: z.string().uuid().optional().nullable(),
  positionId: z.string().uuid().optional().nullable(),
  shiftId: z.string().uuid(),
  contractType: z.enum([ContractType.PERMANENT, ContractType.TRAINING]),
  contractNumber: z.string().optional().nullable(),
  contractStartDate: z.string().transform(str => new Date(str)),
  contractEndDate: z.string().optional().nullable().transform(str => str ? new Date(str) : null),
  warningStatus: z.enum([
    WarningStatus.NONE,
    WarningStatus.SP1,
    WarningStatus.SP2,
    WarningStatus.SP3
  ]).optional().default(WarningStatus.NONE),
  gender: z.enum([Gender.MALE, Gender.FEMALE]).optional().default(Gender.MALE),
  address: z.string().optional().nullable(),
  faceData: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    // Pastikan koneksi database tersedia sebelum query
    const { ensureDatabaseConnection } = await import('@/lib/db/prisma');
    const isConnected = await ensureDatabaseConnection();
    
    if (!isConnected) {
      console.error('Gagal terhubung ke database');
      return NextResponse.json(
        { error: 'Database tidak tersedia' },
        { status: 503 }
      );
    }

    // Validasi koneksi dengan $connect()
    await prisma.$connect();

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    const withFaceData = searchParams.get('withFaceData');
    
    if (search) {
      // Implementasikan pencarian langsung dengan enhanced error handling
      try {
        const employees = await prisma.employee.findMany({
          where: {
            deletedAt: null, // Filter hanya karyawan aktif yang tidak diarsipkan
            OR: [
              { employeeId: { contains: search, mode: 'insensitive' } },
              { user: { name: { contains: search, mode: 'insensitive' } } },
              { user: { email: { contains: search, mode: 'insensitive' } } },
              { department: { name: { contains: search, mode: 'insensitive' } } },
              { subDepartment: { name: { contains: search, mode: 'insensitive' } } },
            ],
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
            faceData: true,
            createdAt: true,
            updatedAt: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
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
        return NextResponse.json(employees);
      } catch (searchError) {
        console.error('Error dalam pencarian karyawan:', searchError);
        
        // Retry jika error koneksi
        if (String(searchError).toLowerCase().includes('connection')) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          await prisma.$disconnect();
          await prisma.$connect();
          
          const retryEmployees = await prisma.employee.findMany({
            where: {
              deletedAt: null, // Filter hanya karyawan aktif yang tidak diarsipkan
              OR: [
                { employeeId: { contains: search, mode: 'insensitive' } },
                { user: { name: { contains: search, mode: 'insensitive' } } },
                { user: { email: { contains: search, mode: 'insensitive' } } },
                { department: { name: { contains: search, mode: 'insensitive' } } },
                { subDepartment: { name: { contains: search, mode: 'insensitive' } } },
              ],
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
              faceData: true,
              createdAt: true,
              updatedAt: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                },
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
          return NextResponse.json(retryEmployees);
        }
        
        throw searchError;
      }
    }
    
    if (withFaceData === 'true') {
      // Ambil karyawan yang memiliki data wajah dengan enhanced error handling
      try {
        const employees = await prisma.employee.findMany({
          where: {
            deletedAt: null, // Filter hanya karyawan aktif yang tidak diarsipkan
            faceData: {
              not: null
            }
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
            faceData: true,
            createdAt: true,
            updatedAt: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
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
        
        return NextResponse.json({
          success: true,
          message: 'Data karyawan dengan wajah berhasil diambil',
          employees: employees
        });
      } catch (faceDataError) {
        console.error('Error dalam mengambil data karyawan dengan wajah:', faceDataError);
        
        // Retry jika error koneksi
        if (String(faceDataError).toLowerCase().includes('connection')) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          await prisma.$disconnect();
          await prisma.$connect();
          
          const retryEmployees = await prisma.employee.findMany({
            where: {
              deletedAt: null, // Filter hanya karyawan aktif yang tidak diarsipkan
              faceData: {
                not: null
              }
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
              faceData: true,
              createdAt: true,
              updatedAt: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                },
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
          
          return NextResponse.json({
            success: true,
            message: 'Data karyawan dengan wajah berhasil diambil',
            employees: retryEmployees
          });
        }
        
        throw faceDataError;
      }
    }
    
    // Menggunakan service function yang sudah enhanced
    const employees = await getAllEmployees();
    return NextResponse.json(employees);
    
  } catch (error) {
    console.error('Gagal mengambil data karyawan:', error);
    
    // Enhanced error logging untuk debugging
    console.error('Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown error',
    });
    
    // Check jika ini adalah error koneksi database
    const errorMessage = String(error).toLowerCase();
    if (
      errorMessage.includes('connection') &&
      (errorMessage.includes('reset') || 
       errorMessage.includes('closed') || 
       errorMessage.includes('timeout') ||
       errorMessage.includes('p1017'))
    ) {
      return NextResponse.json(
        { 
          error: 'Koneksi database terputus. Silakan coba lagi dalam beberapa saat.',
          code: 'DB_CONNECTION_ERROR'
        },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Terjadi kesalahan saat mengambil data karyawan',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validasi input
    const validatedData = employeeCreateSchema.parse(data);
    
    // Buat karyawan baru dengan Prisma langsung daripada menggunakan fungsi createEmployee
    const employee = await prisma.employee.create({
      data: {
        user: { connect: { id: validatedData.userId } },
        employeeId: validatedData.employeeId,
        department: { connect: { id: validatedData.departmentId } },
        subDepartment: validatedData.subDepartmentId
          ? { connect: { id: validatedData.subDepartmentId } }
          : undefined,
        shift: { connect: { id: validatedData.shiftId } },
        contractType: validatedData.contractType,
        contractNumber: validatedData.contractNumber,
        contractStartDate: validatedData.contractStartDate,
        contractEndDate: validatedData.contractEndDate,
        warningStatus: validatedData.warningStatus || WarningStatus.NONE,
        faceData: validatedData.faceData,
      },
      include: {
        user: true,
        department: true,
        subDepartment: true,
        shift: true,
      },
    });
    
    return NextResponse.json(employee, { status: 201 });
  } catch (error) {
    console.error('Gagal membuat karyawan baru:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validasi gagal', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat membuat karyawan' },
      { status: 500 }
    );
  }
} 