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
    const employeeId = params.id;
    
    console.log(`GET /api/employees/${employeeId} dipanggil`);
    
    if (!employeeId) {
      console.log('ID karyawan tidak diberikan');
      return NextResponse.json(
        { success: false, error: 'ID karyawan diperlukan' },
        { status: 400 }
      );
    }
    
    // Ambil data karyawan dengan semua relasi yang diperlukan
    console.log(`Mengambil data untuk karyawan ID: ${employeeId}`);
    const employee = await getEmployeeById(employeeId);
    console.log('Hasil query employee:', employee ? 'Data ditemukan' : 'Tidak ditemukan');
    
    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'Karyawan tidak ditemukan' },
        { status: 404 }
      );
    }

    // Buat objek dasar untuk respons
    const safeEmployee = {
      id: employee.id,
      employeeId: employee.employeeId || '',
      userId: employee.userId || '',
      departmentId: employee.departmentId || '',
      positionId: employee.positionId || null,
      shiftId: employee.shiftId || '',
      contractType: employee.contractType || 'TRAINING',
      contractNumber: employee.contractNumber || null,
      contractStartDate: employee.contractStartDate?.toISOString() || new Date().toISOString(),
      contractEndDate: employee.contractEndDate?.toISOString() || null,
      warningStatus: employee.warningStatus || 'NONE',
      gender: employee.gender || null,
      address: employee.address || null,
      faceData: employee.faceData || null,
      createdAt: employee.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: employee.updatedAt?.toISOString() || new Date().toISOString(),
      
      // Tambahkan objek terpisah untuk setiap relasi dengan pengecekan null yang ketat
      user: {
        id: employee.user?.id || '',
        name: employee.user?.name || 'Nama tidak tersedia',
        email: employee.user?.email || '-',
        role: employee.user?.role || 'user'
      },
      
      department: {
        id: employee.department?.id || '',
        name: employee.department?.name || 'Departemen tidak tersedia'
      },
      
      position: employee.position ? {
        id: employee.position.id,
        name: employee.position.name,
        level: employee.position.level || 0
      } : null,
      
      subDepartment: employee.subDepartment ? {
        id: employee.subDepartment.id,
        name: employee.subDepartment.name
      } : null,
      
      shift: {
        id: employee.shift?.id || '',
        name: employee.shift?.name || 'Shift tidak tersedia',
        shiftType: employee.shift?.shiftType || 'NORMAL'
      }
    };
    
    console.log('Mengembalikan respons untuk karyawan ID:', employeeId);
    return NextResponse.json({ 
      success: true, 
      data: safeEmployee 
    });
  } catch (error) {
    console.error('Gagal mengambil data karyawan:', error);
    // Tambahkan detail error untuk debugging
    const errorMessage = error instanceof Error 
      ? `${error.message}\n${error.stack}`
      : String(error);
      
    return NextResponse.json(
      { 
        success: false, 
        error: 'Terjadi kesalahan saat mengambil data karyawan',
        details: errorMessage
      },
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
    // Menggunakan await pada params terlebih dahulu
    const employeeParams = await params;
    const employeeId = employeeParams.id;
    
    const data = await request.json();
    
    // Validasi input
    const validatedData = employeeUpdateSchema.parse(data);
    
    // Update karyawan
    const employee = await updateEmployee(employeeId, validatedData);
    
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
    // Menggunakan await pada params terlebih dahulu
    const employeeParams = await params;
    const employeeId = employeeParams.id;
    
    await deleteEmployee(employeeId);
    
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
    // Menggunakan await pada params terlebih dahulu
    const employeeParams = await params;
    const employeeId = employeeParams.id;
    
    const data = await request.json();
    const operation = request.nextUrl.searchParams.get('operation');
    
    // Memeriksa operasi yang diminta
    switch (operation) {
      case 'shift':
        // Update shift karyawan
        const shiftData = shiftUpdateSchema.parse(data);
        const updatedShift = await updateEmployeeShift(employeeId, shiftData.shiftId);
        return NextResponse.json(updatedShift);
        
      case 'position':
        // Update jabatan karyawan
        const positionData = positionUpdateSchema.parse(data);
        const updatedPosition = await updateEmployeePosition(employeeId, positionData.positionId);
        return NextResponse.json(updatedPosition);
        
      case 'warning':
        // Update status peringatan karyawan
        const warningData = warningStatusUpdateSchema.parse(data);
        const updatedWarning = await updateEmployeeWarningStatus(employeeId, warningData.warningStatus);
        return NextResponse.json(updatedWarning);
        
      case 'face':
        // Update data wajah karyawan
        const faceData = faceDataUpdateSchema.parse(data);
        const updatedFace = await updateEmployeeFaceData(employeeId, faceData.faceData);
        return NextResponse.json(updatedFace);
        
      case 'contract':
        // Update kontrak karyawan
        const contractData = contractUpdateSchema.parse(data);
        const updatedContract = await updateEmployeeContract(employeeId, contractData);
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