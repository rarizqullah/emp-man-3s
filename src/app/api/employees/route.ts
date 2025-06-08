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
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    const withFaceData = searchParams.get('withFaceData');
    
    if (search) {
      // Implementasikan pencarian langsung di sini untuk menggantikan fungsi searchEmployees
      const employees = await prisma.employee.findMany({
        where: {
          OR: [
            { employeeId: { contains: search, mode: 'insensitive' } },
            { user: { name: { contains: search, mode: 'insensitive' } } },
            { user: { email: { contains: search, mode: 'insensitive' } } },
            { department: { name: { contains: search, mode: 'insensitive' } } },
            { subDepartment: { name: { contains: search, mode: 'insensitive' } } },
          ],
        },
        include: {
          user: {
            select: {
              id: true,
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
      return NextResponse.json(employees);
    }
    
    if (withFaceData === 'true') {
      // Ambil karyawan yang memiliki data wajah
      const employees = await prisma.employee.findMany({
        where: {
          faceData: {
            not: null
          }
        },
        include: {
          user: {
            select: {
              id: true,
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
      
      return NextResponse.json({
        success: true,
        message: 'Data karyawan dengan wajah berhasil diambil',
        employees: employees
      });
    }
    
    const employees = await getAllEmployees();
    return NextResponse.json(employees);
  } catch (error) {
    console.error('Gagal mengambil data karyawan:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengambil data karyawan' },
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