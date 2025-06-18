import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { NextRequest } from 'next/server';

// POST /api/shifts/update-working-days
// Endpoint untuk memperbarui hari kerja default pada shift yang belum memiliki data
// POST /api/shifts/update-working-days?action=clean-non-shift untuk membersihkan NON_SHIFT
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    // Jika action adalah clean-non-shift, jalankan pembersihan NON_SHIFT
    if (action === 'clean-non-shift') {
      const result = await cleanNonShiftWorkingDays();
      return NextResponse.json(result);
    }
    
    // Default action: update working days untuk SHIFT_A dan SHIFT_B
    console.log('[UPDATE WORKING DAYS] Memulai pembaruan hari kerja shift...');
    
    // Ambil semua shift yang belum memiliki hari kerja atau hari kerja kosong, kecuali NON_SHIFT
    const shiftsWithoutWorkingDays = await prisma.shift.findMany({
      where: {
        AND: [
          {
            OR: [
              { workingDays: { isEmpty: true } },
              { workingDays: { equals: [] } }
            ]
          },
          {
            shiftType: {
              not: 'NON_SHIFT' // Exclude NON_SHIFT karena harus tetap fleksibel
            }
          }
        ]
      }
    });

    console.log(`[UPDATE WORKING DAYS] Ditemukan ${shiftsWithoutWorkingDays.length} shift tanpa hari kerja`);

    const updates = [];

    for (const shift of shiftsWithoutWorkingDays) {
      // Set hari kerja default berdasarkan tipe shift
      let defaultWorkingDays: string[] = [];
      
      switch (shift.shiftType) {
        case 'NON_SHIFT':
          // Non-shift biasanya Senin-Jumat
          defaultWorkingDays = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];
          break;
        case 'SHIFT_A':
        case 'SHIFT_B':
          // Shift kerja biasanya 6 hari kerja
          defaultWorkingDays = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
          break;
        default:
          // Default fallback
          defaultWorkingDays = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];
      }

      const updateData = {
        workingDays: defaultWorkingDays
      };

      updates.push({
        shiftId: shift.id,
        shiftName: shift.name,
        shiftType: shift.shiftType,
        workingDays: defaultWorkingDays
      });

      // Update shift dengan hari kerja default
      await prisma.shift.update({
        where: { id: shift.id },
        data: updateData
      });

      console.log(`[UPDATE WORKING DAYS] Updated shift: ${shift.name} (${shift.shiftType}) dengan hari kerja: ${defaultWorkingDays.join(', ')}`);
    }

    console.log(`[UPDATE WORKING DAYS] Selesai memperbarui ${updates.length} shift`);

    return NextResponse.json({
      success: true,
      message: `Berhasil memperbarui ${updates.length} shift dengan hari kerja default`,
      updates: updates,
      count: updates.length
    });

  } catch (error) {
    console.error('[UPDATE WORKING DAYS] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Gagal memperbarui hari kerja shift',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET /api/shifts/update-working-days
// Endpoint untuk memeriksa shift yang belum memiliki hari kerja
export async function GET() {
  try {
    const shiftsWithoutWorkingDays = await prisma.shift.findMany({
      where: {
        AND: [
          {
            OR: [
              { workingDays: { isEmpty: true } },
              { workingDays: { equals: [] } }
            ]
          },
          {
            shiftType: {
              not: 'NON_SHIFT' // Exclude NON_SHIFT karena harus tetap fleksibel
            }
          }
        ]
      },
      select: {
        id: true,
        name: true,
        shiftType: true,
        workingDays: true
      }
    });

    return NextResponse.json({
      success: true,
      shifts: shiftsWithoutWorkingDays,
      count: shiftsWithoutWorkingDays.length
    });

  } catch (error) {
    console.error('[CHECK WORKING DAYS] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Gagal memeriksa hari kerja shift',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST /api/shifts/update-working-days?action=clean-non-shift
// Endpoint untuk membersihkan hari kerja NON_SHIFT (set ke array kosong)
async function cleanNonShiftWorkingDays() {
  try {
    console.log('[CLEAN NON_SHIFT] Memulai pembersihan hari kerja NON_SHIFT...');
    
    // Ambil semua shift NON_SHIFT yang memiliki hari kerja
    const nonShiftsWithWorkingDays = await prisma.shift.findMany({
      where: {
        AND: [
          { shiftType: 'NON_SHIFT' },
          { 
            NOT: {
              OR: [
                { workingDays: { isEmpty: true } },
                { workingDays: { equals: [] } }
              ]
            }
          }
        ]
      }
    });

    console.log(`[CLEAN NON_SHIFT] Ditemukan ${nonShiftsWithWorkingDays.length} NON_SHIFT dengan hari kerja`);

    const updates = [];

    for (const shift of nonShiftsWithWorkingDays) {
      // Set hari kerja ke array kosong untuk NON_SHIFT
      await prisma.shift.update({
        where: { id: shift.id },
        data: { workingDays: [] }
      });

      updates.push({
        shiftId: shift.id,
        shiftName: shift.name,
        previousWorkingDays: shift.workingDays,
        newWorkingDays: []
      });

      console.log(`[CLEAN NON_SHIFT] Cleared working days for: ${shift.name}`);
    }

    console.log(`[CLEAN NON_SHIFT] Selesai membersihkan ${updates.length} NON_SHIFT`);

    return {
      success: true,
      message: `Berhasil membersihkan hari kerja untuk ${updates.length} NON_SHIFT`,
      updates: updates,
      count: updates.length
    };

  } catch (error) {
    console.error('[CLEAN NON_SHIFT] Error:', error);
    throw error;
  }
} 