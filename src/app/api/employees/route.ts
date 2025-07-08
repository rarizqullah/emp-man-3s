import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { 
  getAllEmployees, 
} from '@/lib/db/employee.service';
import { ContractType, WarningStatus, Gender } from '@prisma/client';
import { prisma } from '@/lib/db';

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
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    const withFaceData = searchParams.get('withFaceData');
    
    // Pagination parameters
    const take = Math.min(parseInt(searchParams.get('take') || '25'), 100); // Max 100 items per request
    const skip = parseInt(searchParams.get('skip') || '0');
    
    // Lightweight select for list view
    const lightSelect = {
      id: true,
      employeeId: true,
      departmentId: true,
      subDepartmentId: true,
      positionId: true,
      shiftId: true,
      contractType: true,
      contractStartDate: true,
      contractEndDate: true,
      warningStatus: true,
      gender: true,
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
    };
    
    // Add faceData only when explicitly requested
    const selectFields = withFaceData === 'true' 
      ? { ...lightSelect, faceData: true, contractNumber: true, address: true }
      : lightSelect;
      
    // Define search conditions
    const searchConditions = search ? {
      OR: [
        { employeeId: { contains: search, mode: 'insensitive' as const } },
        { user: { name: { contains: search, mode: 'insensitive' as const } } },
        { user: { email: { contains: search, mode: 'insensitive' as const } } },
        { department: { name: { contains: search, mode: 'insensitive' as const } } },
        { subDepartment: { name: { contains: search, mode: 'insensitive' as const } } },
      ],
    } : {};
    
    if (search) {
      // Implementasikan pencarian dengan pagination dan lightweight select
      const employees = await prisma.employee.findMany({
        where: {
          deletedAt: null,
          ...searchConditions,
        },
        select: selectFields,
        take,
        skip,
        orderBy: [
          { user: { name: 'asc' } },
          { employeeId: 'asc' }
        ]
      });
      
      // Get total count for pagination
      
      const total = await prisma.employee.count({
        where: {
          deletedAt: null,
          ...searchConditions,
        },
      });
      
      return NextResponse.json({
        data: employees,
        pagination: {
          total,
          take,
          skip,
          hasMore: skip + take < total
        }
      });
    }
    
    // Default query untuk semua karyawan atau yang memiliki face data
    const whereCondition = {
      deletedAt: null,
      ...(withFaceData === 'true' ? { faceData: { not: null } } : {}),
    };
    
    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where: whereCondition,
        select: selectFields,
        take,
        skip,
        orderBy: [
          { user: { name: 'asc' } },
          { employeeId: 'asc' }
        ]
      }),
      prisma.employee.count({
        where: whereCondition,
      })
    ]);
    
    return NextResponse.json({
      data: employees,
      pagination: {
        total,
        take,
        skip,
        hasMore: skip + take < total
      }
    });
    
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