import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Validasi sesi user menggunakan Supabase auth
    const cookieStore = cookies();
    const supabase = createServerComponentClient({ cookies: () => cookieStore });
    
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Dapatkan data user dari database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User tidak ditemukan' },
        { status: 404 }
      );
    }

    // Cek apakah user adalah admin
    const isAdmin = user.role === 'ADMIN';
    
    // Query parameter
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
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
    } else if (isAdmin) {
      // Admin bisa melihat semua data karyawan
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
      hasFaceData: employee.faceData ? true : false
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
      error: 'Terjadi kesalahan saat mengambil data karyawan' 
    }, { status: 500 });
  }
} 