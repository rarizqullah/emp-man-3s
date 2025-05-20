import { NextRequest, NextResponse } from 'next/server';
import { 
  getWarningHistoryByEmployeeId, 
  createWarningHistory 
} from '@/lib/db/employee-history.service';

// GET /api/employees/[id]/warning-history
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Await params terlebih dahulu
    const { id } = await params;
    console.log(`[GET] /api/employees/${id}/warning-history - Request received`);
    
    const employeeId = id;
    console.log(`Getting warning history for employee: ${employeeId}`);
    
    try {
      // Pastikan koneksi database
      const { ensureDatabaseConnection } = await import('@/lib/db/prisma');
      await ensureDatabaseConnection();
      
      const warningHistory = await getWarningHistoryByEmployeeId(employeeId);
      console.log(`Warning history data fetched: ${JSON.stringify(warningHistory)}`);
      
      return NextResponse.json({ 
        success: true, 
        data: warningHistory || [] 
      });
    } catch (dbError) {
      console.error(`Database error in warning history:`, dbError);
      if (isConnectionError(dbError)) {
        return NextResponse.json(
          { success: false, message: 'Terjadi kesalahan koneksi database, silakan coba lagi nanti' },
          { status: 503 }
        );
      }
      throw dbError;
    }
  } catch (error: unknown) {
    console.error(`Error in warning history GET:`, error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, message: `Failed to get warning history: ${errorMessage}` },
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

// POST /api/employees/[id]/warning-history
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Await params terlebih dahulu
    const { id } = await params;
    console.log(`[POST] /api/employees/${id}/warning-history - Request received`);
    
    const employeeId = id;
    const data = await request.json();
    console.log(`Creating warning history for employee ${employeeId} with data:`, data);
    
    // Validasi data dasar
    if (!data.warningStatus || !data.startDate) {
      return NextResponse.json(
        { success: false, message: 'Status SP dan tanggal mulai wajib diisi' },
        { status: 400 }
      );
    }
    
    // Format data untuk service
    const warningData = {
      employee: { connect: { id: employeeId } },
      warningStatus: data.warningStatus,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : null,
      reason: data.reason,
      attachmentUrl: data.attachmentUrl || null
    };
    
    const warningHistory = await createWarningHistory(warningData);
    console.log(`Warning history created successfully:`, warningHistory);
    
    return NextResponse.json({ 
      success: true, 
      data: warningHistory 
    });
  } catch (error: unknown) {
    console.error(`Error in warning history POST:`, error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, message: `Gagal menambahkan riwayat SP: ${errorMessage}` },
      { status: 500 }
    );
  }
} 