import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// POST /api/shifts/update-break-times
// Endpoint untuk memperbarui jam istirahat pada shift yang belum memiliki data
export async function POST() {
  try {
    console.log('=== Update Break Times Started ===');
    
    // Ambil semua shift yang ada
    const shifts = await prisma.shift.findMany({
      where: {
        shiftType: {
          not: 'NON_SHIFT' // Hanya update shift yang bukan NON_SHIFT
        }
      }
    });

    const updates = [];

    for (const shift of shifts) {
      let lunchBreakStart: Date | null = null;
      let lunchBreakEnd: Date | null = null;

      // Skip jika sudah ada konfigurasi jam istirahat
      if (shift.lunchBreakStart && shift.lunchBreakEnd) {
        console.log(`[SKIP] Shift ${shift.name} sudah memiliki konfigurasi jam istirahat`);
        continue;
      }

      // Tentukan jam istirahat berdasarkan jam kerja atau tipe shift
      const mainWorkStart = shift.mainWorkStart;
      const startHour = mainWorkStart ? mainWorkStart.getHours() : 0;

      // Logic untuk menentukan jam istirahat berdasarkan shift
      if (shift.shiftType === 'SHIFT_A' || (startHour >= 6 && startHour <= 10)) {
        // Shift Pagi (06:00-14:00) - Istirahat 12:00-13:00
        lunchBreakStart = new Date();
        lunchBreakStart.setHours(12, 0, 0, 0);
        lunchBreakEnd = new Date();
        lunchBreakEnd.setHours(13, 0, 0, 0);
      } else if (shift.shiftType === 'SHIFT_B' || (startHour >= 14 && startHour <= 18)) {
        // Shift Siang (14:00-22:00) - Istirahat 18:00-19:00
        lunchBreakStart = new Date();
        lunchBreakStart.setHours(18, 0, 0, 0);
        lunchBreakEnd = new Date();
        lunchBreakEnd.setHours(19, 0, 0, 0);
      } else if (startHour >= 19 || startHour <= 4) {
        // Shift Malam (19:00-04:00) - Istirahat 00:00-01:00
        lunchBreakStart = new Date();
        lunchBreakStart.setHours(0, 0, 0, 0);
        lunchBreakEnd = new Date();
        lunchBreakEnd.setHours(1, 0, 0, 0);
      } else {
        // Shift Normal - Istirahat 12:00-13:00
        lunchBreakStart = new Date();
        lunchBreakStart.setHours(12, 0, 0, 0);
        lunchBreakEnd = new Date();
        lunchBreakEnd.setHours(13, 0, 0, 0);
      }

      if (lunchBreakStart && lunchBreakEnd) {
        await prisma.shift.update({
          where: { id: shift.id },
          data: {
            lunchBreakStart,
            lunchBreakEnd
          }
        });

        updates.push({
          id: shift.id,
          name: shift.name,
          lunchBreakStart: lunchBreakStart.toTimeString().slice(0, 5),
          lunchBreakEnd: lunchBreakEnd.toTimeString().slice(0, 5)
        });

        console.log(`[UPDATE BREAK TIMES] Updated shift ${shift.name} dengan jam istirahat ${lunchBreakStart.toTimeString().slice(0, 5)} - ${lunchBreakEnd.toTimeString().slice(0, 5)}`);
      }
    }

    console.log(`=== Update Break Times Completed: ${updates.length} shifts updated ===`);

    return NextResponse.json({
      success: true,
      message: `Berhasil memperbarui jam istirahat untuk ${updates.length} shift`,
      data: updates
    });

  } catch (error) {
    console.error('Error updating break times:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Gagal memperbarui jam istirahat shift',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET /api/shifts/update-break-times
// Endpoint untuk memeriksa shift yang belum memiliki jam istirahat
export async function GET() {
  try {
    const shiftsWithoutBreakTime = await prisma.shift.findMany({
      where: {
        OR: [
          { lunchBreakStart: null },
          { lunchBreakEnd: null }
        ]
      },
      select: {
        id: true,
        name: true,
        shiftType: true,
        mainWorkStart: true,
        mainWorkEnd: true,
        lunchBreakStart: true,
        lunchBreakEnd: true
      }
    });

    return NextResponse.json({
      success: true,
      count: shiftsWithoutBreakTime.length,
      shifts: shiftsWithoutBreakTime
    });

  } catch (error) {
    console.error('[CHECK BREAK TIMES] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Terjadi kesalahan saat memeriksa data shift' 
      },
      { status: 500 }
    );
  }
} 