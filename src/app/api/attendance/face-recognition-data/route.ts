import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    console.log('=== Face Recognition Data API Called ===');
    
    // Ambil semua karyawan yang memiliki data wajah untuk face recognition
    const employees = await prisma.employee.findMany({
      where: {
        AND: [
          { faceData: { not: null } },
          { faceData: { not: '' } }
        ]
      },
      select: {
        id: true,
        employeeId: true,
        faceData: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        department: {
          select: {
            id: true,
            name: true
          }
        },
        shift: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    console.log(`Found ${employees.length} employees with face data for recognition`);

    // Filter dan format data untuk face recognition
    const faceRecognitionData = employees
      .filter(employee => employee.faceData && employee.faceData.trim() !== '')
      .map(employee => ({
        id: employee.id,
        employeeId: employee.employeeId,
        userId: employee.user.id,
        name: employee.user.name,
        email: employee.user.email,
        departmentName: employee.department?.name || 'Unknown',
        shiftName: employee.shift?.name || 'Unknown',
        faceData: employee.faceData
      }));

    console.log(`Processed ${faceRecognitionData.length} employees for face recognition`);

    return NextResponse.json({
      success: true,
      message: 'Data face recognition berhasil diambil',
      data: faceRecognitionData,
      count: faceRecognitionData.length
    });

  } catch (error) {
    console.error('Error fetching face recognition data:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Terjadi kesalahan saat mengambil data face recognition',
      debug: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 