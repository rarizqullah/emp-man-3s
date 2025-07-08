import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { batchProcessDescriptors, FACE_UTILS_CONFIG } from '@/lib/face-utils';

export async function GET() {
  try {
    console.log('=== Optimized Face Recognition Descriptors API Called ===');
    
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
        },
        department: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    console.log(`Found ${employees.length} employees with face data in database`);

    // Gunakan batch processing yang dioptimalkan
    const processedEmployees = batchProcessDescriptors(
      employees.map(emp => ({
        id: emp.id,
        employeeId: emp.employeeId,
        name: emp.user.name,
        faceData: emp.faceData || '',
        userId: emp.user.id,
        department: emp.department?.name
      }))
    );

    // Filter dan format data untuk response
    const processedData = processedEmployees
      .filter(emp => emp.isValid)
      .map(emp => ({
        id: emp.id,
        employeeId: emp.employeeId,
        userId: emp.userId,
        name: emp.name,
        department: emp.department,
        descriptor: Array.from(emp.descriptor), // Convert Float32Array to regular array for JSON
        source: emp.source
      }));

    console.log(`Successfully processed ${processedData.length} face descriptors out of ${employees.length} employees with face data`);

    // Jika tidak ada data face yang valid, coba buat dummy data untuk testing
    if (processedData.length === 0) {
      console.log('No valid face data found, checking if we should create dummy data...');
      
      // Cek apakah ada karyawan tanpa face data
      const employeesWithoutFace = await prisma.employee.findMany({
        where: {
          faceData: null
        },
        take: 2,
        include: {
          user: {
            select: {
              id: true,
              name: true
            }
          },
          department: {
            select: {
              name: true
            }
          }
        }
      });

      if (employeesWithoutFace.length > 0) {
        console.log(`Found ${employeesWithoutFace.length} employees without face data`);
        
        // Buat dummy face descriptors untuk testing
        const dummyData = employeesWithoutFace.slice(0, 2).map((employee, index) => {
          const seed = employee.id + employee.user.name;
          const descriptor = Array.from({length: 128}, (_, i) => {
            const charCode = seed.charCodeAt(i % seed.length);
            return Math.sin(charCode * (i + index + 1) * 0.1) * 0.3 + (index * 0.1);
          });

          return {
            id: employee.id,
            employeeId: employee.employeeId,
            userId: employee.user.id,
            name: employee.user.name,
            department: employee.department?.name,
            descriptor: descriptor
          };
        });
        
        console.log('⚠️ Using dummy face data for testing');
        
        return NextResponse.json({
          success: true,
          message: 'Data descriptor wajah berhasil diambil (dummy data untuk testing)',
          data: dummyData,
          testing: true,
          note: 'Ini adalah data dummy untuk testing. Silakan tambahkan face data asli di menu karyawan.'
        });
      }
    }

    // Return processed data (could be from real images, JSON descriptors, or mixed)
    const message = processedData.length > 0 
      ? 'Data descriptor wajah berhasil diambil'
      : 'Tidak ada data wajah yang valid ditemukan';

    return NextResponse.json({
      success: true,
      message,
      data: processedData,
      stats: {
        totalEmployeesWithFaceData: employees.length,
        validProcessedData: processedData.length,
        hasBase64Images: employees.some(emp => emp.faceData?.startsWith('data:image/')),
        hasJsonDescriptors: employees.some(emp => emp.faceData && !emp.faceData.startsWith('data:image/')),
        employeeDetails: processedData.map(emp => ({
          name: emp.name,
          employeeId: emp.employeeId,
          descriptorLength: emp.descriptor.length
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching face descriptors:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Terjadi kesalahan saat mengambil data descriptor wajah',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 