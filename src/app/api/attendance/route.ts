import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest, verifyToken } from '@/lib/jwt-client';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// Schema validasi untuk input presensi
const attendanceSchema = z.object({
  employeeId: z.string().uuid('ID Karyawan harus berupa UUID'),
  mode: z.enum(['checkIn', 'checkOut']),
  isManual: z.boolean().optional().default(false),
});

// Helper function untuk mendapatkan session dari token JWT
async function getSession(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) return null;
    
    const payload = await verifyToken(token);
    if (!payload) return null;
    
    // Ambil data user lengkap dari database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        employee: {
          include: {
            department: true,
            position: true
          }
        }
      }
    });
    
    if (!user) return null;
    
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        employeeId: user.employee?.id
      }
    };
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Validasi sesi user
    const session = await getSession(request);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Hanya admin yang boleh input manual
    const isAdmin = session.user.role === 'ADMIN';

    // Parse body request
    const body = await request.json();
    
    // Validasi data
    const { employeeId, mode, isManual } = attendanceSchema.parse(body);

    // Jika input manual, pastikan user adalah admin
    if (isManual && !isAdmin) {
      return NextResponse.json(
        { error: 'Hanya admin yang dapat melakukan input presensi manual' },
        { status: 403 }
      );
    }

    // Ambil data karyawan
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        shift: true,
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!employee) {
      return NextResponse.json(
        { error: 'Karyawan tidak ditemukan' },
        { status: 404 }
      );
    }

    // Dapatkan tanggal hari ini
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Cek apakah sudah ada presensi hari ini
    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        employeeId,
        attendanceDate: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    // Tentukan jam saat ini untuk presensi
    const now = new Date();

    if (mode === 'checkIn') {
      // Jika sudah check in, tolak request
      if (existingAttendance?.checkInTime) {
        return NextResponse.json(
          { error: 'Karyawan sudah melakukan check in hari ini' },
          { status: 400 }
        );
      }

      // Jika belum ada presensi hari ini, buat record baru
      if (!existingAttendance) {
        const attendance = await prisma.attendance.create({
          data: {
            employeeId,
            attendanceDate: today,
            checkInTime: now,
            status: 'PRESENT',
          },
        });

        return NextResponse.json({
          success: true,
          message: 'Check in berhasil',
          data: attendance,
        });
      } else {
        // Update record yang sudah ada
        const attendance = await prisma.attendance.update({
          where: { id: existingAttendance.id },
          data: {
            checkInTime: now,
            status: 'PRESENT',
          },
        });

        return NextResponse.json({
          success: true,
          message: 'Check in berhasil',
          data: attendance,
        });
      }
    } else if (mode === 'checkOut') {
      // Jika belum check in, tolak request
      if (!existingAttendance?.checkInTime) {
        return NextResponse.json(
          { error: 'Karyawan belum check in hari ini' },
          { status: 400 }
        );
      }

      // Jika sudah check out, tolak request
      if (existingAttendance.checkOutTime) {
        return NextResponse.json(
          { error: 'Karyawan sudah check out hari ini' },
          { status: 400 }
        );
      }

      // Update record presensi yang ada
      const attendance = await prisma.attendance.update({
        where: { id: existingAttendance.id },
        data: {
          checkOutTime: now,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Check out berhasil',
        data: attendance,
      });
    }

    return NextResponse.json(
      { error: 'Mode presensi tidak valid' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error saat mencatat presensi:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Data presensi tidak valid', details: error.format() },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mencatat presensi' },
      { status: 500 }
    );
  }
} 