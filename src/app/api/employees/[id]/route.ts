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
import { ensureDatabaseConnection } from "@/lib/db/prisma";

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
  // Menggunakan await pada params terlebih dahulu
  const employeeParams = await params;
  const employeeId = employeeParams.id;
  
  console.log(`GET request untuk karyawan dengan ID: ${employeeId}`);
  
  try {
    // Pastikan koneksi database terbentuk
    const dbConnected = await ensureDatabaseConnection();
    if (!dbConnected) {
      console.error(`Koneksi database gagal untuk karyawan ID: ${employeeId}`);
      return NextResponse.json(
        { error: "Gagal terhubung ke database, silakan coba lagi nanti" },
        { status: 503 }
      );
    }
    
    console.log(`Mengambil data karyawan dengan ID: ${employeeId}`);
    const employee = await getEmployeeById(employeeId);
    
    if (!employee) {
      console.log(`Karyawan dengan ID ${employeeId} tidak ditemukan`);
      return NextResponse.json(
        { error: `Karyawan dengan ID ${employeeId} tidak ditemukan` },
        { status: 404 }
      );
    }
    
    console.log(`Data karyawan ditemukan untuk ID: ${employeeId}`);
    console.log(`User data tersedia: ${Boolean(employee.user)}`);
    
    // Buat objek yang aman untuk respons
    try {
      const safeEmployee = {
        // Data Identitas Karyawan
        id: employee.id,
        employeeId: employee.employeeId,
        name: employee.user?.name || 'Nama tidak tersedia',
        
        // Data Pribadi
        gender: employee.gender,
        address: employee.address || '',
        faceData: employee.faceData || null,
        
        // Data Pekerjaan
        departmentId: employee.departmentId,
        subDepartmentId: employee.subDepartmentId,
        positionId: employee.positionId,
        shiftId: employee.shiftId,
        userId: employee.userId,
        
        // Informasi Kontrak
        contractType: employee.contractType,
        contractNumber: employee.contractNumber || '',
        contractStartDate: employee.contractStartDate,
        contractEndDate: employee.contractEndDate,
        
        // Status Karyawan
        warningStatus: employee.warningStatus,
        createdAt: employee.createdAt,
        updatedAt: employee.updatedAt,
        
        // Relasi Objek
        department: employee.department ? {
          id: employee.department.id,
          name: employee.department.name,
        } : null,
        
        subDepartment: employee.subDepartment ? {
          id: employee.subDepartment.id,
          name: employee.subDepartment.name,
          departmentId: employee.subDepartment.departmentId,
        } : null,
        
        position: employee.position ? {
          id: employee.position.id,
          name: employee.position.name,
          description: employee.position.description,
          level: employee.position.level,
        } : null,
        
        shift: employee.shift ? {
          id: employee.shift.id,
          name: employee.shift.name,
          shiftType: employee.shift.shiftType,
          mainWorkStart: employee.shift.mainWorkStart,
          mainWorkEnd: employee.shift.mainWorkEnd,
          lunchBreakStart: employee.shift.lunchBreakStart,
          lunchBreakEnd: employee.shift.lunchBreakEnd,
          regularOvertimeStart: employee.shift.regularOvertimeStart,
          regularOvertimeEnd: employee.shift.regularOvertimeEnd,
          weeklyOvertimeStart: employee.shift.weeklyOvertimeStart,
          weeklyOvertimeEnd: employee.shift.weeklyOvertimeEnd,
        } : null,
        
        // Menggunakan data user yang telah diambil melalui relasi Prisma
        user: employee.user ? {
          id: employee.user.id,
          name: employee.user.name || 'Nama tidak tersedia',
          email: employee.user.email || 'Email tidak tersedia',
          role: employee.user.role || 'EMPLOYEE',
        } : {
          id: '',
          name: 'Nama tidak tersedia',
          email: 'Email tidak tersedia',
          role: 'EMPLOYEE',
        },
      };
      
      console.log(`Mengirim respons untuk karyawan ID: ${employeeId}`);
      return NextResponse.json(safeEmployee);
    } catch (formatError) {
      console.error(`Error saat memformat data karyawan: ${formatError}`);
      return NextResponse.json(
        { error: "Terjadi kesalahan saat memformat data karyawan" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error(`Error GET /api/employees/${employeeId}:`, error);
    
    // Cek apakah error koneksi database
    const errorMessage = String(error).toLowerCase();
    if (
      errorMessage.includes('connection') && 
      (errorMessage.includes('reset') || 
       errorMessage.includes('closed') || 
       errorMessage.includes('timeout'))
    ) {
      return NextResponse.json(
        { error: "Koneksi ke database gagal, silakan coba lagi nanti" },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: `Terjadi kesalahan: ${error instanceof Error ? error.message : String(error)}` },
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