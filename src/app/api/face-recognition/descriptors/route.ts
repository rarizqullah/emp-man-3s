import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    // Ambil data karyawan yang memiliki face data
    const employees = await prisma.employee.findMany({
      where: {
        faceData: {
          not: null
        }
      },
      select: {
        id: true,
        employeeId: true,
        faceData: true,
        user: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // Proses data wajah untuk memastikan format yang konsisten
    const processedData = employees.map(employee => {
      try {
        // Parse data face yang sudah tersimpan sebagai JSON
        if (!employee.faceData) return null;
        
        let faceData;
        try {
          faceData = JSON.parse(employee.faceData);
        } catch (e) {
          console.error(`Invalid face data format for employee ${employee.id}`);
          return null;
        }
        
        // Pastikan data memiliki descriptor
        if (!faceData.descriptor) return null;
        
        return {
          id: employee.id,
          employeeId: employee.employeeId,
          userId: employee.user.id,
          name: employee.user.name,
          descriptor: faceData.descriptor
        };
      } catch (e) {
        console.error(`Error processing face data for employee ${employee.id}:`, e);
        return null;
      }
    }).filter(item => item !== null);

    return NextResponse.json({
      success: true,
      message: 'Data descriptor wajah berhasil diambil',
      data: processedData
    });
  } catch (error) {
    console.error('Error fetching face descriptors:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Terjadi kesalahan saat mengambil data descriptor wajah' 
    }, { status: 500 });
  }
} 