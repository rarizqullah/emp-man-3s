import { NextRequest, NextResponse } from 'next/server';
import { supabaseRouteHandler } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  try {
    // Validasi sesi user menggunakan Supabase auth
    const supabase = await supabaseRouteHandler();
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

    const { employeeId } = params;
    
    // Cek apakah user yang sedang login adalah admin atau employee itu sendiri
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        department: true,
        position: true,
        shift: true
      }
    });
    
    if (!employee) {
      return NextResponse.json(
        { error: 'Data karyawan tidak ditemukan' },
        { status: 404 }
      );
    }
    
    // Hanya admin atau employee itu sendiri yang bisa mengakses data
    const isAdmin = user.role === 'ADMIN';
    const isOwnData = employee.user.id === user.id;
    
    if (!isAdmin && !isOwnData) {
      return NextResponse.json(
        { error: 'Tidak memiliki akses untuk melihat data karyawan lain' },
        { status: 403 }
      );
    }
    
    // Format data response
    const formattedEmployee = {
      id: employee.id,
      name: employee.user.name,
      email: employee.user.email,
      department: employee.department?.name,
      position: employee.position?.name,
      shift: employee.shift,
      // Tambahkan informasi lain yang diperlukan
    };
    
    return NextResponse.json({
      success: true,
      message: 'Data karyawan berhasil diambil',
      data: formattedEmployee
    });
  } catch (error) {
    console.error('Error fetching employee data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Terjadi kesalahan saat mengambil data karyawan' 
      }, 
      { status: 500 }
    );
  }
} 