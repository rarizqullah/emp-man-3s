import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { 
  getAllEmployees, 
  createEmployee,
  searchEmployees
} from '@/lib/db/employee.service';
import { ContractType, WarningStatus, Gender } from '@prisma/client';

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
    
    if (search) {
      const employees = await searchEmployees(search);
      return NextResponse.json(employees);
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
    
    // Buat karyawan baru
    const employee = await createEmployee(validatedData);
    
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