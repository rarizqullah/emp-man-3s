import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  try {
    // Validasi sesi user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const employeeId = params.employeeId;
    
    // Cek apakah user adalah admin atau karyawan yang bersangkutan
    const isAdmin = session.user.role === 'ADMIN';
    const isOwnData = session.user.id === employeeId;
    
    if (!isAdmin && !isOwnData) {
      return NextResponse.json(
        { error: 'Anda tidak memiliki izin untuk mengakses data ini' },
        { status: 403 }
      );
    }

    // Ambil query parameter 'date' jika ada
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    
    // Tentukan filter tanggal
    let dateFilter: any = {};
    
    if (dateParam) {
      // Jika parameter tanggal diberikan, filter berdasarkan tanggal tersebut
      const dateParts = dateParam.split('-');
      if (dateParts.length === 3) {
        const [year, month, day] = dateParts;
        const specificDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        
        const nextDate = new Date(specificDate);
        nextDate.setDate(nextDate.getDate() + 1);
        
        dateFilter = {
          createdAt: {
            gte: specificDate,
            lt: nextDate,
          },
        };
      }
    } else {
      // Default: ambil semua data presensi (bisa batasi dengan limit)
      // Tidak ada filter tanggal
    }

    // Cari employee berdasarkan user ID jika parameter adalah ID user
    let employee;
    if (employeeId.includes('-')) {  // Cek apakah employeeId adalah UUID
      // Cari berdasarkan user ID
      employee = await prisma.employee.findUnique({
        where: { userId: employeeId },
      });
    } else {
      // Cari berdasarkan employeeId (nomor pegawai)
      employee = await prisma.employee.findUnique({
        where: { employeeId: employeeId },
      });
    }

    if (!employee) {
      return NextResponse.json(
        { error: 'Karyawan tidak ditemukan' },
        { status: 404 }
      );
    }

    // Ambil data presensi
    const attendance = await prisma.attendance.findFirst({
      where: {
        employeeId: employee.id,
        ...dateFilter,
      },
      include: {
        employee: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
            department: true,
            subDepartment: true,
            position: true,
            shift: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Untuk query history presensi (tanpa filter tanggal spesifik)
    const attendanceHistory = await prisma.attendance.findMany({
      where: {
        employeeId: employee.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10, // Ambil 10 data terbaru
    });

    return NextResponse.json({
      success: true,
      attendance,
      history: attendanceHistory,
    });
  } catch (error) {
    console.error('Error mengambil data presensi:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengambil data presensi' },
      { status: 500 }
    );
  }
} 