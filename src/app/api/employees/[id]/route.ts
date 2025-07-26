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
import { ensureDatabaseConnection, prisma } from '@/lib/db';

// Schema validasi untuk update employee - UPDATED untuk mendukung field user
const employeeUpdateSchema = z.object({
  // User data - TAMBAHAN BARU
  name: z.string().min(1, "Nama harus diisi").optional(),
  email: z.string().email("Format email tidak valid").optional(),
  phone: z.string().optional().nullable(),
  
  // Employee data (yang sudah ada)
  departmentId: z.string().uuid().optional(),
  subDepartmentId: z.string().uuid().optional().nullable(),
  positionId: z.string().uuid().optional().nullable(),
  shiftId: z.string().uuid().optional(),
  contractType: z.enum([ContractType.PERMANENT, ContractType.TRAINING]).optional(),
  contractNumber: z.string().optional().nullable(),
  contractStartDate: z.string().optional().transform(str => str ? new Date(str) : undefined),
  contractEndDate: z.string().optional().nullable().transform(str => str ? new Date(str) : null),
  warningStatus: z.enum([
    WarningStatus.NONE,
    WarningStatus.SP1,
    WarningStatus.SP2,
    WarningStatus.SP3
  ]).optional(),
  gender: z.string().optional().transform(val => {
    if (!val) return undefined;
    return val === 'FEMALE' || val === 'Female' || val === 'female' ? Gender.FEMALE : Gender.MALE;
  }),
  address: z.string().optional().nullable(),
  bankAccountNumber: z.string().optional().nullable(),
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

// Enhanced safe delete function dengan retry mechanism
async function safeDeleteEmployee(employeeId: string, retries = 3): Promise<boolean> {
  let attempt = 0;
  
  while (attempt < retries) {
    try {
      console.log(`Attempting to delete employee (attempt ${attempt + 1}/${retries})`);
      
      // Ensure fresh connection before delete operation
      if (attempt > 0) {
        console.log('Refreshing database connection for delete operation...');
        await prisma.$disconnect();
        await new Promise(resolve => setTimeout(resolve, 1000));
        await prisma.$connect();
      }
      
      // Delete operation dengan timeout
      const deletePromise = deleteEmployee(employeeId);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Delete operation timeout after 25 seconds')), 25000);
      });
      
      await Promise.race([deletePromise, timeoutPromise]);
      
      console.log(`Successfully deleted employee ${employeeId}`);
      return true;
      
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      console.error(`Delete attempt ${attempt + 1} failed:`, err?.code || err?.message);
      
      const errorMessage = String(error).toLowerCase();
      const isRetryableError = (
        err?.code === 'P1017' ||
        err?.code === 'P1008' ||
        err?.code === 'P1001' ||
        err?.code === 'P1002' ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('connection') ||
        errorMessage.includes('server has closed') ||
        errorMessage.includes('bytes remaining')
      );
      
      if (isRetryableError && attempt < retries - 1) {
        attempt++;
        const waitTime = Math.min(2000 * Math.pow(2, attempt), 8000);
        console.log(`Retrying delete operation in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      throw error;
    }
  }
  
  throw new Error('Max retries exceeded for delete operation');
}

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
    // Enhanced database connection dengan timeout
    console.log('Memastikan koneksi database...');
    const dbConnected = await Promise.race([
      ensureDatabaseConnection(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database connection timeout')), 5000)
      )
    ]);
    
    if (!dbConnected) {
      console.error(`Koneksi database gagal untuk karyawan ID: ${employeeId}`);
      return NextResponse.json(
        { error: "Gagal terhubung ke database, silakan coba lagi nanti" },
        { status: 503 }
      );
    }
    
    console.log(`Mengambil data karyawan dengan ID: ${employeeId}`);
    
    // Enhanced timeout handling untuk query
    const employee = await Promise.race([
      getEmployeeById(employeeId),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Employee query timeout')), 15000)
      )
    ]) as any;
    
    if (!employee) {
      console.log(`Karyawan dengan ID ${employeeId} tidak ditemukan`);
      return NextResponse.json(
        { error: `Karyawan dengan ID ${employeeId} tidak ditemukan` },
        { status: 404 }
      );
    }
    
    console.log(`Data karyawan ditemukan untuk ID: ${employeeId}`);
    console.log(`User data tersedia: ${Boolean(employee.user)}`);
    
    // Buat objek yang aman untuk respons dengan optimized structure
    try {
      const safeEmployee = {
        // Data Identitas Karyawan
        id: employee.id,
        employeeId: employee.employeeId,
        name: employee.user?.name || 'Nama tidak tersedia',
        
        // Data Pribadi
        gender: employee.gender,
        address: employee.address || '',
        bankAccountNumber: employee.bankAccountNumber || null,
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
        
        // Relasi Objek - simplified untuk mengurangi payload
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
        
        // User data dengan fallback yang aman
        user: employee.user ? {
          id: employee.user.id,
          name: employee.user.name || 'Nama tidak tersedia',
          email: employee.user.email || 'Email tidak tersedia',
          phone: employee.user.phone || null, // Tambahkan field phone
          role: employee.user.role || 'EMPLOYEE',
        } : {
          id: '',
          name: 'Nama tidak tersedia',
          email: 'Email tidak tersedia',
          phone: null,
          role: 'EMPLOYEE',
        },
      };
      
      console.log(`Mengirim respons untuk karyawan ID: ${employeeId} dengan ukuran data optimized`);
      
      // Return dengan headers untuk caching yang optimal
      return new NextResponse(JSON.stringify(safeEmployee), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    } catch (formatError) {
      console.error(`Error saat memformat data karyawan: ${formatError}`);
      return NextResponse.json(
        { error: "Terjadi kesalahan saat memformat data karyawan" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error(`Error GET /api/employees/${employeeId}:`, error);
    
    // Enhanced error handling untuk timeout dan connection issues
    const errorMessage = String(error).toLowerCase();
    
    if (errorMessage.includes('timeout')) {
      console.log('Timeout terdeteksi, memberikan respons timeout yang user-friendly');
      return NextResponse.json(
        { 
          error: "Permintaan membutuhkan waktu terlalu lama. Silakan coba lagi.",
          retryable: true,
          errorType: 'timeout'
        },
        { status: 408 }
      );
    }
    
    if (
      errorMessage.includes('connection') && 
      (errorMessage.includes('reset') || 
       errorMessage.includes('closed') || 
       errorMessage.includes('refused') ||
       errorMessage.includes('p1017'))
    ) {
      console.log('Connection error terdeteksi, memberikan respons yang user-friendly');
      return NextResponse.json(
        { 
          error: "Masalah koneksi database. Silakan coba lagi dalam beberapa saat.",
          retryable: true,
          errorType: 'connection'
        },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { 
        error: "Terjadi kesalahan pada server", 
        retryable: false,
        errorType: 'server'
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
    
    console.log(`PUT request untuk employee dengan ID: ${employeeId}`);
    
    const data = await request.json();
    console.log('Data yang diterima:', JSON.stringify(data, null, 2));
    
    // Validasi input
    const validatedData = employeeUpdateSchema.parse(data);
    console.log('Data setelah validasi:', JSON.stringify(validatedData, null, 2));
    
    // Update karyawan
    const employee = await updateEmployee(employeeId, validatedData);
    console.log('Employee berhasil diupdate:', employee.id);
    
    return NextResponse.json(employee);
  } catch (error) {
    console.error('Gagal mengupdate karyawan:', error);
    
    if (error instanceof z.ZodError) {
      console.error('Zod validation errors:', error.errors);
      return NextResponse.json(
        { error: 'Validasi gagal', details: error.errors },
        { status: 400 }
      );
    }
    
    // Log detail error untuk debugging
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengupdate karyawan', details: error instanceof Error ? error.message : String(error) },
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
    
    console.log(`DELETE request untuk karyawan dengan ID: ${employeeId}`);
    
    // Step 1: Enhanced database connection check dengan extended timeout
    console.log('Checking database connection health for delete operation...');
    const connectionHealthy = await Promise.race([
      ensureDatabaseConnection(),
      new Promise<boolean>((_, reject) => 
        setTimeout(() => reject(new Error('Database connection timeout')), 10000)
      )
    ]);
    
    if (!connectionHealthy) {
      console.error(`Database connection failed for delete employee ID: ${employeeId}`);
      return NextResponse.json(
        { 
          error: "Database tidak tersedia saat ini. Silakan coba lagi dalam beberapa saat.",
          retryable: true,
          errorType: 'connection'
        },
        { status: 503 }
      );
    }
    
    console.log('Database connection is healthy, proceeding with delete operation...');
    
    // Step 2: Execute safe delete with retry mechanism
    try {
      await safeDeleteEmployee(employeeId, 3);
      
      console.log(`Karyawan dengan ID ${employeeId} berhasil dihapus`);
      
      return NextResponse.json({ 
        message: 'Karyawan berhasil dihapus',
        success: true,
        timestamp: new Date().toISOString()
      });
      
    } catch (deleteError: unknown) {
      const err = deleteError as { code?: string; message?: string };
      console.error('Failed to delete employee after all retries:', deleteError);
      
      // Enhanced error categorization untuk delete operations
      const errorMessage = String(deleteError).toLowerCase();
      let userError = 'Terjadi kesalahan saat menghapus karyawan';
      let statusCode = 500;
      let retryable = false;
      let errorType = 'server';
      
      // Check for salary/allowance validation errors first
      if (errorMessage.includes('data gaji') || errorMessage.includes('belum dibayar') || errorMessage.includes('riwayat gaji')) {
        userError = err?.message || 'Karyawan memiliki data gaji yang harus ditangani terlebih dahulu.';
        statusCode = 409;
        retryable = false;
        errorType = 'salary_data';
      } else if (errorMessage.includes('data tunjangan')) {
        userError = err?.message || 'Karyawan memiliki data tunjangan yang harus dihapus terlebih dahulu.';
        statusCode = 409;
        retryable = false;
        errorType = 'allowance_data';
      } else if (errorMessage.includes('timeout')) {
        userError = 'Operasi penghapusan membutuhkan waktu terlalu lama. Silakan coba lagi.';
        statusCode = 408;
        retryable = true;
        errorType = 'timeout';
      } else if (errorMessage.includes('foreign key constraint') || errorMessage.includes('masih memiliki data terkait')) {
        userError = 'Karyawan tidak dapat dihapus karena masih memiliki data terkait (presensi, riwayat kontrak, dll). Silakan hapus data terkait terlebih dahulu.';
        statusCode = 409;
        retryable = false;
        errorType = 'constraint';
      } else if (errorMessage.includes('not found') || errorMessage.includes('tidak ditemukan')) {
        userError = 'Karyawan tidak ditemukan atau sudah dihapus sebelumnya.';
        statusCode = 404;
        retryable = false;
        errorType = 'not_found';
      } else if (errorMessage.includes('connection') || err?.code?.startsWith('P10')) {
        userError = 'Masalah koneksi database. Silakan coba lagi dalam beberapa saat.';
        statusCode = 503;
        retryable = true;
        errorType = 'connection';
      }
      
      return NextResponse.json(
        { 
          error: userError,
          retryable,
          errorType,
          debug: process.env.NODE_ENV === 'development' ? err?.message : undefined,
          timestamp: new Date().toISOString()
        },
        { status: statusCode }
      );
    }
    
  } catch (error: unknown) {
    const err = error as { name?: string; code?: string; message?: string };
    console.error('Unexpected error in delete employee API:', error);
    
    // Enhanced error logging untuk debugging
    console.error('Delete error details:', {
      name: err?.name,
      code: err?.code,
      message: err?.message,
      employeeId: (await params).id
    });
    
    return NextResponse.json(
      { 
        error: "Terjadi kesalahan tidak terduga saat menghapus karyawan. Silakan coba lagi atau hubungi administrator.",
        retryable: true,
        errorType: 'server',
        debug: process.env.NODE_ENV === 'development' ? err?.message : undefined,
        timestamp: new Date().toISOString()
      },
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