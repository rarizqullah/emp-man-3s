import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ensureDatabaseConnection } from '@/lib/db/prisma';

// Types for the response
interface EmployeeWithFaceData {
  id: string;
  employeeId: string;
  faceData: string | null;
  user: {
    id: string;
    name: string;
    email: string;
  };
  department: {
    id: string;
    name: string;
  } | null;
  shift: {
    id: string;
    name: string;
  } | null;
}

// Enhanced safe query function dengan timeout dan retry mechanism
async function safeFindEmployeesWithFaceData(retries = 3): Promise<EmployeeWithFaceData[]> {
  let attempt = 0;
  
  while (attempt < retries) {
    try {
      console.log(`Attempting to fetch face data (attempt ${attempt + 1}/${retries})`);
      
      // Ensure fresh connection before query
      if (attempt > 0) {
        console.log('Refreshing database connection...');
        await prisma.$disconnect();
        await new Promise(resolve => setTimeout(resolve, 1000));
        await prisma.$connect();
      }
      
      // Enhanced query dengan timeout dan optimized field selection
      const queryPromise = prisma.employee.findMany({
        where: {
          AND: [
            { faceData: { not: null } },
            { faceData: { not: '' } }
          ]
        },
        select: {
          // Minimal fields untuk mengurangi payload
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
        },
        // Limit untuk menghindari query yang terlalu besar
        take: 500
      });
      
      // Query dengan timeout 15 detik
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Query timeout after 15 seconds')), 15000);
      });
      
      const result = await Promise.race([queryPromise, timeoutPromise]);
      
      console.log(`Successfully fetched ${result.length} employees with face data`);
      return result;
      
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      console.error(`Query attempt ${attempt + 1} failed:`, err?.code || err?.message);
      
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
        const waitTime = Math.min(1000 * Math.pow(2, attempt), 5000);
        console.log(`Retrying in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      throw error;
    }
  }
  
  throw new Error('Max retries exceeded for face data query');
}

export async function GET() {
  try {
    console.log('=== Face Recognition Data API Called ===');
    
    // Step 1: Ensure database connection is healthy
    console.log('Checking database connection health...');
    const connectionHealthy = await ensureDatabaseConnection();
    
    if (!connectionHealthy) {
      console.error('Database connection is not healthy');
      return NextResponse.json({ 
        success: false, 
        error: 'Database tidak tersedia saat ini. Silakan coba lagi dalam beberapa saat.',
        retryable: true,
        errorType: 'connection'
      }, { status: 503 });
    }
    
    console.log('Database connection is healthy, proceeding with query...');
    
    // Step 2: Execute safe query with retry mechanism
    let employees;
    try {
      employees = await safeFindEmployeesWithFaceData(3);
    } catch (queryError: unknown) {
      const err = queryError as { code?: string; message?: string };
      console.error('Failed to fetch employees after all retries:', queryError);
      
      // Categorize error for better user feedback
      const errorMessage = String(queryError).toLowerCase();
      let userError = 'Terjadi kesalahan saat mengambil data face recognition';
      let statusCode = 500;
      let retryable = false;
      
      if (errorMessage.includes('timeout')) {
        userError = 'Permintaan membutuhkan waktu terlalu lama. Silakan coba lagi.';
        statusCode = 408;
        retryable = true;
      } else if (errorMessage.includes('connection') || err?.code?.startsWith('P10')) {
        userError = 'Koneksi database bermasalah. Silakan coba lagi dalam beberapa saat.';
        statusCode = 503;
        retryable = true;
      }
      
      return NextResponse.json({
        success: false,
        error: userError,
        retryable,
        errorType: errorMessage.includes('timeout') ? 'timeout' : 'connection',
        debug: process.env.NODE_ENV === 'development' ? err?.message : undefined
      }, { status: statusCode });
    }
    
    console.log(`Found ${employees.length} employees with face data for recognition`);
    
    // Step 3: Process and format data efficiently
    const faceRecognitionData = employees
      .filter(employee => {
        // Additional validation untuk memastikan faceData valid
        if (!employee.faceData || employee.faceData.trim() === '') {
          return false;
        }
        
        // Basic validation untuk format faceData
        const faceData = employee.faceData.trim();
        if (faceData.length < 10) {
          console.warn(`Invalid face data length for employee ${employee.employeeId}`);
          return false;
        }
        
        return true;
      })
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
    
    // Step 4: Return successful response
    return NextResponse.json({
      success: true,
      message: 'Data face recognition berhasil diambil',
      data: faceRecognitionData,
      count: faceRecognitionData.length,
      timestamp: new Date().toISOString()
    });

  } catch (error: unknown) {
    const err = error as { name?: string; code?: string; message?: string; stack?: string };
    console.error('Unexpected error in face recognition data API:', error);
    
    // Enhanced error logging untuk debugging
    console.error('Error details:', {
      name: err?.name,
      code: err?.code,
      message: err?.message,
      stack: process.env.NODE_ENV === 'development' ? err?.stack : 'Hidden in production'
    });
    
    return NextResponse.json({ 
      success: false, 
      error: 'Terjadi kesalahan tidak terduga saat mengambil data face recognition',
      retryable: true,
      errorType: 'server',
      debug: process.env.NODE_ENV === 'development' ? err?.message : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 