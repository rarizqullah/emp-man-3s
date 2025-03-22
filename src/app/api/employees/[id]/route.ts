import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { 
  getEmployeeById, 
  updateEmployee, 
  deleteEmployee,
  updateEmployeeShift,
  updateEmployeePosition,
  updateEmployeeWarningStatus,
  updateEmployeeFaceData,
  updateEmployeeContract
} from '@/lib/db/employee.service';
import { ContractType, WarningStatus, Gender } from '@prisma/client';

// Schema validasi untuk update employee
const employeeUpdateSchema = z.object({
  departmentId: z.string().uuid().optional(),
  subDepartmentId: z.string().uuid().optional().nullable(),
  positionId: z.string().uuid().optional().nullable(),
  shiftId: z.string().uuid().optional(),
  contractType: z.enum([ContractType.PERMANENT, ContractType.TRAINING]).optional(),
  contractNumber: z.string().optional().nullable(),
  contractStartDate: z.string().transform(str => new Date(str)).optional(),
  contractEndDate: z.string().optional().nullable().transform(str => str ? new Date(str) : null),
  warningStatus: z.enum([
    WarningStatus.NONE,
    WarningStatus.SP1,
    WarningStatus.SP2,
    WarningStatus.SP3
  ]).optional(),
  gender: z.enum([Gender.MALE, Gender.FEMALE]).optional(),
  address: z.string().optional().nullable(),
  faceData: z.string().optional().nullable(),
});

// Schema untuk update shift karyawan
const shiftUpdateSchema = z.object({
  shiftId: z.string().uuid(),
});

// Schema untuk update jabatan karyawan
const positionUpdateSchema = z.object({
  positionId: z.string().uuid(),
});

// Schema untuk update status peringatan karyawan
const warningStatusUpdateSchema = z.object({
  warningStatus: z.enum([
    WarningStatus.NONE,
    WarningStatus.SP1,
    WarningStatus.SP2,
    WarningStatus.SP3
  ]),
});

// Schema untuk update data wajah karyawan
const faceDataUpdateSchema = z.object({
  faceData: z.string(),
});

// Schema untuk update kontrak karyawan
const contractUpdateSchema = z.object({
  contractType: z.enum([ContractType.PERMANENT, ContractType.TRAINING]),
  contractNumber: z.string().optional().nullable(),
  contractStartDate: z.string().transform(str => new Date(str)),
  contractEndDate: z.string().optional().nullable().transform(str => str ? new Date(str) : null),
});

// Mendapatkan karyawan berdasarkan ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const employee = await getEmployeeById(params.id);
    
    if (!employee) {
      return NextResponse.json(
        { error: 'Karyawan tidak ditemukan' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(employee);
  } catch (error) {
    console.error('Gagal mengambil data karyawan:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengambil data karyawan' },
      { status: 500 }
    );
  }
}

// Update karyawan
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json();
    
    // Validasi input
    const validatedData = employeeUpdateSchema.parse(data);
    
    // Update karyawan
    const employee = await updateEmployee(params.id, validatedData);
    
    return NextResponse.json(employee);
  } catch (error) {
    console.error('Gagal mengupdate karyawan:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validasi gagal', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengupdate karyawan' },
      { status: 500 }
    );
  }
}

// Hapus karyawan
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await deleteEmployee(params.id);
    
    return NextResponse.json({ message: 'Karyawan berhasil dihapus' });
  } catch (error) {
    console.error('Gagal menghapus karyawan:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat menghapus karyawan' },
      { status: 500 }
    );
  }
}

// Partial update karyawan untuk operasi spesifik
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json();
    const operation = request.nextUrl.searchParams.get('operation');
    
    // Memeriksa operasi yang diminta
    switch (operation) {
      case 'shift':
        // Update shift karyawan
        const shiftData = shiftUpdateSchema.parse(data);
        const updatedShift = await updateEmployeeShift(params.id, shiftData.shiftId);
        return NextResponse.json(updatedShift);
        
      case 'position':
        // Update jabatan karyawan
        const positionData = positionUpdateSchema.parse(data);
        const updatedPosition = await updateEmployeePosition(params.id, positionData.positionId);
        return NextResponse.json(updatedPosition);
        
      case 'warning':
        // Update status peringatan karyawan
        const warningData = warningStatusUpdateSchema.parse(data);
        const updatedWarning = await updateEmployeeWarningStatus(params.id, warningData.warningStatus);
        return NextResponse.json(updatedWarning);
        
      case 'face':
        // Update data wajah karyawan
        const faceData = faceDataUpdateSchema.parse(data);
        const updatedFace = await updateEmployeeFaceData(params.id, faceData.faceData);
        return NextResponse.json(updatedFace);
        
      case 'contract':
        // Update kontrak karyawan
        const contractData = contractUpdateSchema.parse(data);
        const updatedContract = await updateEmployeeContract(params.id, contractData);
        return NextResponse.json(updatedContract);
        
      default:
        return NextResponse.json(
          { error: 'Operasi tidak valid' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Gagal mengupdate karyawan:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validasi gagal', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengupdate karyawan' },
      { status: 500 }
    );
  }
} 