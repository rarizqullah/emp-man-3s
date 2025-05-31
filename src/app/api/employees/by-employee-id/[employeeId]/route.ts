import { NextRequest, NextResponse } from 'next/server';
import { getEmployeeByEmployeeId } from '@/lib/db/employee.service';
import { ensureDatabaseConnection } from "@/lib/db/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  try {
    // Await params terlebih dahulu
    const employeeParams = await params;
    const employeeId = employeeParams.employeeId;
    
    console.log(`[API] Mencari karyawan dengan employeeId: ${employeeId}`);
    
    // Pastikan koneksi database
    await ensureDatabaseConnection();
    
    // Cari karyawan berdasarkan employeeId
    const employee = await getEmployeeByEmployeeId(employeeId);
    
    if (!employee) {
      console.log(`Karyawan dengan employeeId ${employeeId} tidak ditemukan`);
      return NextResponse.json(
        { 
          success: false, 
          message: `Karyawan dengan ID ${employeeId} tidak ditemukan` 
        },
        { status: 404 }
      );
    }
    
    console.log(`Berhasil menemukan karyawan: ${employee.user?.name || 'Nama tidak tersedia'}`);
    
    // Format data untuk response
    const formattedEmployee = {
      id: employee.id,
      employeeId: employee.employeeId,
      name: employee.user?.name || 'Nama tidak tersedia',
      email: employee.user?.email || '',
      role: employee.user?.role || 'EMPLOYEE',
      faceData: employee.faceData,
      
      // Data departemen
      department: employee.department ? {
        id: employee.department.id,
        name: employee.department.name,
      } : null,
      
      // Data sub departemen
      subDepartment: employee.subDepartment ? {
        id: employee.subDepartment.id,
        name: employee.subDepartment.name,
      } : null,
      
      // Data shift
      shift: employee.shift ? {
        id: employee.shift.id,
        name: employee.shift.name,
        shiftType: employee.shift.shiftType,
      } : null,
      
      // Data kontrak
      contractType: employee.contractType,
      contractStartDate: employee.contractStartDate,
      contractEndDate: employee.contractEndDate,
      warningStatus: employee.warningStatus,
      
      // Data pribadi
      gender: employee.gender,
      address: employee.address,
      
      // Timestamp
      createdAt: employee.createdAt,
      updatedAt: employee.updatedAt,
    };
    
    return NextResponse.json({
      success: true,
      data: formattedEmployee
    });
  } catch (error) {
    console.error('Error saat mengambil data karyawan:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Terjadi kesalahan saat mengambil data karyawan' 
      },
      { status: 500 }
    );
  }
} 