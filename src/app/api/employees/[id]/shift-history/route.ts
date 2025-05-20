import { NextRequest, NextResponse } from 'next/server';
import { getShiftHistoryByEmployeeId, createShiftHistory } from '@/lib/db/employee-history.service';
import { getShiftById } from '@/lib/db/shift.service';
import { updateEmployeeShift } from '@/lib/db/employee.service';
import { revalidatePath } from "next/cache";

// GET /api/employees/[id]/shift-history
// Mendapatkan riwayat perubahan shift karyawan
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Await params terlebih dahulu
    const { id } = await params;
    console.log(`[GET] /api/employees/${id}/shift-history - Request received`);
    
    const employeeId = id;
    console.log(`Getting shift history for employee: ${employeeId}`);
    
    try {
      // Pastikan koneksi database
      const { ensureDatabaseConnection } = await import('@/lib/db/prisma');
      await ensureDatabaseConnection();
      
      const shiftHistory = await getShiftHistoryByEmployeeId(employeeId);
      console.log(`Shift history data fetched: ${JSON.stringify(shiftHistory)}`);
      
      return NextResponse.json({ 
        success: true, 
        data: shiftHistory || [] 
      });
    } catch (dbError) {
      console.error(`Database error in shift history:`, dbError);
      if (isConnectionError(dbError)) {
        return NextResponse.json(
          { success: false, message: 'Terjadi kesalahan koneksi database, silakan coba lagi nanti' },
          { status: 503 }
        );
      }
      throw dbError;
    }
  } catch (error: unknown) {
    console.error(`Error in shift history GET:`, error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, message: `Failed to get shift history: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// Fungsi untuk mengecek apakah error adalah error koneksi
function isConnectionError(error: unknown): boolean {
  if (!error) return false;
  
  const errorMessage = String(error).toLowerCase();
  return (
    errorMessage.includes('connection') &&
    (errorMessage.includes('reset') || 
     errorMessage.includes('closed') || 
     errorMessage.includes('terminated') ||
     errorMessage.includes('timeout') ||
     errorMessage.includes('could not connect'))
  );
}

// POST /api/employees/[id]/shift-history
// Menambahkan riwayat perubahan shift karyawan
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Await params terlebih dahulu
    const { id } = await params;
    console.log(`[POST] /api/employees/${id}/shift-history - Request received`);
    
    const employeeId = id;
    const data = await request.json();
    console.log(`Creating shift history for employee ${employeeId} with data:`, data);
    
    // Validasi data dasar
    if (!data.shiftId || !data.effectiveDate) {
      return NextResponse.json(
        { success: false, message: 'Shift ID dan tanggal efektif wajib diisi' },
        { status: 400 }
      );
    }
    
    // Periksa shift exists
    const shift = await getShiftById(data.shiftId);
    if (!shift) {
      return NextResponse.json(
        { success: false, message: 'Shift tidak ditemukan' },
        { status: 404 }
      );
    }
    
    // Format data untuk service
    const shiftData = {
      employee: { connect: { id: employeeId } },
      shift: { connect: { id: data.shiftId } },
      startDate: new Date(data.effectiveDate),
      endDate: data.endDate ? new Date(data.endDate) : null,
      notes: data.notes || null
    };
    
    // 1. Update employee's current shift - selalu update shift saat ini
    const updatedEmployee = await updateEmployeeShift(employeeId, data.shiftId);
    console.log(`Employee shift updated successfully:`, updatedEmployee);
    
    // 2. Create shift history
    const shiftHistory = await createShiftHistory(shiftData);
    console.log(`Shift history created successfully:`, shiftHistory);
    
    // Revalidasi jalur untuk memperbarui UI
    revalidatePath(`/employee/${employeeId}`);
    revalidatePath('/employee');
    
    return NextResponse.json({ 
      success: true, 
      data: shiftHistory,
      employee: updatedEmployee
    });
  } catch (error: unknown) {
    console.error(`Error in shift history POST:`, error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, message: `Gagal membuat riwayat shift: ${errorMessage}` },
      { status: 500 }
    );
  }
} 