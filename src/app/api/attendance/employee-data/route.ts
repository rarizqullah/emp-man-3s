import { NextRequest, NextResponse } from 'next/server';
import { supabaseRouteHandler } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';
import { Session } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    console.log('=== Employee Data API Called ===');
    
    // Validasi sesi user menggunakan Supabase auth
    const supabase = await supabaseRouteHandler();
    
    // Coba dapatkan session dari cookie atau header Authorization
    let session: Session | null = null;
    
    // First try: Get session from cookies (SSR)
    const sessionResult = await supabase.auth.getSession();
    session = sessionResult.data.session;
    const sessionError = sessionResult.error;
    
    // Second try: Get session from Authorization header (client-side requests)
    if (!session) {
      const authHeader = request.headers.get('authorization');
      console.log('Trying authorization header:', authHeader ? 'present' : 'missing');
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
          const userResult = await supabase.auth.getUser(token);
          if (userResult.data.user && !userResult.error) {
            session = {
              user: userResult.data.user,
              access_token: token
            } as Session; // Type assertion for session structure
            console.log('✅ Got user from authorization header');
          }
        } catch (error) {
          console.error('Failed to get user from token:', error);
        }
      }
    }
    
    console.log('Session check:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id,
      sessionError
    });
    
    // If no session found, check if we have any employees in database and return sample data for testing
    if (!session || !session.user) {
      console.log('No session found, checking for any employees in database for testing...');
      
      // Try to get any employees for testing purposes
      const anyEmployees = await prisma.employee.findMany({
        take: 5, // Limit to 5 for testing
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          department: true,
          subDepartment: true,
          position: true,
          shift: true
        }
      });
      
      if (anyEmployees.length > 0) {
        console.log(`Found ${anyEmployees.length} employees for testing`);
        
        const formattedData = anyEmployees.map(employee => ({
          id: employee.id,
          employeeId: employee.employeeId,
          userId: employee.user.id,
          name: employee.user.name,
          email: employee.user.email,
          departmentId: employee.departmentId,
          departmentName: employee.department?.name,
          subDepartmentId: employee.subDepartmentId,
          subDepartmentName: employee.subDepartment?.name,
          positionId: employee.positionId,
          positionName: employee.position?.name,
          shiftId: employee.shiftId,
          shiftName: employee.shift?.name,
          contractType: employee.contractType,
          contractStartDate: employee.contractStartDate,
          contractEndDate: employee.contractEndDate,
          gender: employee.gender,
          hasFaceData: employee.faceData ? true : false,
          // Sertakan faceData jika diminta dan tersedia (untuk testing mode)
          ...(employee.faceData ? { faceData: employee.faceData } : {})
        }));
        
        return NextResponse.json({
          success: true,
          message: 'Data karyawan berhasil diambil (testing mode)',
          data: formattedData,
          testing: true
        });
      }
      
      return NextResponse.json(
        { 
          error: 'Unauthorized - No valid session found and no test data available',
          debug: {
            hasSession: !!session,
            hasUser: !!session?.user,
            sessionError: sessionError?.message,
            employeesInDb: anyEmployees.length
          }
        },
        { status: 401 }
      );
    }

    // Dapatkan data user dari database menggunakan authId
    const user = await prisma.user.findUnique({
      where: { authId: session.user.id },
      select: { id: true, role: true, authId: true, name: true, email: true }
    });

    console.log('Database user lookup:', { found: !!user, authId: session.user.id });

    if (!user) {
      return NextResponse.json(
        { 
          error: 'User tidak ditemukan di database',
          debug: {
            authId: session.user.id,
            sessionEmail: session.user.email
          }
        },
        { status: 404 }
      );
    }

    // Cek apakah user adalah admin
    const isAdmin = user.role === 'ADMIN';
    
    // Query parameter
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const includeFaceData = searchParams.get('includeFaceData') === 'true';
    
    let employees;
    
    if (userId && !isAdmin) {
      // Jika user bukan admin, hanya bisa melihat data dirinya sendiri
      if (userId !== user.id) {
        return NextResponse.json(
          { error: 'Tidak memiliki akses untuk melihat data karyawan lain' },
          { status: 403 }
        );
      }
      
      // Cari karyawan berdasarkan user ID
      employees = await prisma.employee.findMany({
        where: { userId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          department: true,
          subDepartment: true,
          position: true,
          shift: true
        }
      });
    } else if (isAdmin || includeFaceData) {
      // Admin atau request face data bisa melihat semua data karyawan
      employees = await prisma.employee.findMany({
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          department: true,
          subDepartment: true,
          position: true,
          shift: true
        }
      });
    } else {
      // User biasa hanya bisa melihat data dirinya
      employees = await prisma.employee.findMany({
        where: { userId: user.id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          department: true,
          subDepartment: true,
          position: true,
          shift: true
        }
      });
    }

    console.log('Found employees:', employees.length);

    // Format data untuk response
    const formattedData = employees.map(employee => ({
      id: employee.id,
      employeeId: employee.employeeId,
      userId: employee.user.id,
      name: employee.user.name,
      email: employee.user.email,
      departmentId: employee.departmentId,
      departmentName: employee.department?.name,
      subDepartmentId: employee.subDepartmentId,
      subDepartmentName: employee.subDepartment?.name,
      positionId: employee.positionId,
      positionName: employee.position?.name,
      shiftId: employee.shiftId,
      shiftName: employee.shift?.name,
      contractType: employee.contractType,
      contractStartDate: employee.contractStartDate,
      contractEndDate: employee.contractEndDate,
      gender: employee.gender,
      hasFaceData: employee.faceData ? true : false,
      // Sertakan faceData jika diminta dan tersedia
      ...(includeFaceData && employee.faceData ? { faceData: employee.faceData } : {})
    }));

    return NextResponse.json({
      success: true,
      message: 'Data karyawan berhasil diambil',
      data: formattedData
    });
  } catch (error) {
    console.error('Error fetching employee data:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Terjadi kesalahan saat mengambil data karyawan',
      debug: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 