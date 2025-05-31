import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseConnection } from "@/lib/db/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { employeeId, type } = body;
    
    console.log(`[API] Recording attendance: employeeId=${employeeId}, type=${type}`);
    
    // Validasi input
    if (!employeeId) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Employee ID diperlukan' 
        },
        { status: 400 }
      );
    }
    
    if (!type || !['checkIn', 'checkOut'].includes(type)) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Type harus berupa checkIn atau checkOut' 
        },
        { status: 400 }
      );
    }
    
    // Pastikan koneksi database
    await ensureDatabaseConnection();
    
    // Record attendance berdasarkan type
    let result;
    
    if (type === 'checkIn') {
      // Panggil endpoint check-in
      const checkInResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/attendance/check-in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ employeeId }),
      });
      
      if (!checkInResponse.ok) {
        const errorData = await checkInResponse.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || 'Gagal mencatat presensi masuk');
      }
      
      result = await checkInResponse.json();
    } else {
      // Panggil endpoint check-out
      const checkOutResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/attendance/check-out`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ employeeId }),
      });
      
      if (!checkOutResponse.ok) {
        const errorData = await checkOutResponse.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || 'Gagal mencatat presensi keluar');
      }
      
      result = await checkOutResponse.json();
    }
    
    console.log(`[API] Attendance recorded successfully: ${type}`);
    
    return NextResponse.json({
      success: true,
      message: `Presensi ${type === 'checkIn' ? 'masuk' : 'keluar'} berhasil dicatat`,
      data: result.data || result
    });
  } catch (error) {
    console.error('Error recording attendance:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Terjadi kesalahan saat mencatat presensi' 
      },
      { status: 500 }
    );
  }
} 