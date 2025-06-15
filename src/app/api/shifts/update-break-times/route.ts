import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

// POST /api/shifts/update-break-times
// Endpoint untuk memperbarui jam istirahat pada shift yang belum memiliki data
export async function POST() {
  try {
    console.log('[UPDATE BREAK TIMES] Memulai pembaruan jam istirahat shift...');
    
    // Ambil semua shift yang belum memiliki jam istirahat
    const shiftsWithoutBreakTime = await prisma.shift.findMany({
      where: {
        OR: [
          { lunchBreakStart: null },
          { lunchBreakEnd: null }
        ]
      }
    });

    console.log(`[UPDATE BREAK TIMES] Ditemukan ${shiftsWithoutBreakTime.length} shift tanpa jam istirahat`);

    const updates = [];

    for (const shift of shiftsWithoutBreakTime) {
      let lunchBreakStart: Date | null = null;
      let lunchBreakEnd: Date | null = null;

      // Tentukan jam istirahat berdasarkan tipe shift dan jam kerja
      const mainWorkStart = new Date(shift.mainWorkStart);
      
      // Ambil jam dari waktu kerja
      const startHour = mainWorkStart.getHours();

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

    return NextResponse.json({
      success: true,
      message: `Berhasil memperbarui ${updates.length} shift dengan jam istirahat`,
      updates
    });

  } catch (error) {
    console.error('[UPDATE BREAK TIMES] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Terjadi kesalahan saat memperbarui jam istirahat',
        details: error instanceof Error ? error.message : String(error)
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