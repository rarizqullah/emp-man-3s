import { NextRequest, NextResponse } from 'next/server';
import { 
  getWarningHistoryByEmployeeId, 
  createWarningHistory 
} from '@/lib/db/employee-history.service';

// GET /api/employees/[id]/warning-history
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log(`[GET] /api/employees/${params.id}/warning-history - Request received`);
    
    const employeeId = params.id;
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error in warning history GET:`, error);
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
    console.log(`[POST] /api/employees/${params.id}/warning-history - Request received`);
    
    const employeeId = params.id;
    const data = await request.json();
    console.log(`Creating warning history for employee ${employeeId} with data:`, data);
    
    // Validasi data dasar
    if (!data.warningStatus || !data.startDate || !data.reason) {
      return NextResponse.json(
        { success: false, message: 'Warning status, start date, and reason are required' },
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
      attachmentUrl: data.attachmentUrl
    };
    
    try {
      // Pastikan koneksi database
      const { ensureDatabaseConnection } = await import('@/lib/db/prisma');
      await ensureDatabaseConnection();
      
      const warningHistory = await createWarningHistory(warningData);
      console.log(`Warning history created successfully:`, warningHistory);
      
      return NextResponse.json({ 
        success: true, 
        data: warningHistory 
      });
    } catch (dbError) {
      console.error(`Database error in creating warning history:`, dbError);
      if (isConnectionError(dbError)) {
        return NextResponse.json(
          { success: false, message: 'Terjadi kesalahan koneksi database, silakan coba lagi nanti' },
          { status: 503 }
        );
      }
      throw dbError;
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error in warning history POST:`, error);
    return NextResponse.json(
      { success: false, message: `Failed to create warning history: ${errorMessage}` },
      { status: 500 }
    );
  }
} 