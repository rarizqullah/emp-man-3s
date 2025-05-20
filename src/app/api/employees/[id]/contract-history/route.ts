import { NextRequest, NextResponse } from 'next/server';
import { 
  getContractHistoryByEmployeeId, 
  createContractHistory 
} from '@/lib/db/employee-history.service';

// GET /api/employees/[id]/contract-history
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Await params terlebih dahulu
    const { id } = await params;
    console.log(`[GET] /api/employees/${id}/contract-history - Request received`);
    
    const employeeId = id;
    console.log(`Getting contract history for employee: ${employeeId}`);
    
    try {
      // Pastikan koneksi database
      const { ensureDatabaseConnection } = await import('@/lib/db/prisma');
      await ensureDatabaseConnection();
      
      const contractHistory = await getContractHistoryByEmployeeId(employeeId);
      console.log(`Contract history data fetched: ${JSON.stringify(contractHistory)}`);
      
      return NextResponse.json({ 
        success: true, 
        data: contractHistory || [] 
      });
    } catch (dbError) {
      console.error(`Database error in contract history:`, dbError);
      if (isConnectionError(dbError)) {
        return NextResponse.json(
          { success: false, message: 'Terjadi kesalahan koneksi database, silakan coba lagi nanti' },
          { status: 503 }
        );
      }
      throw dbError;
    }
  } catch (error: unknown) {
    console.error(`Error in contract history GET:`, error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, message: `Failed to get contract history: ${errorMessage}` },
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

// POST /api/employees/[id]/contract-history
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Await params terlebih dahulu
    const { id } = await params;
    console.log(`[POST] /api/employees/${id}/contract-history - Request received`);
    
    const employeeId = id;
    const data = await request.json();
    console.log(`Creating contract history for employee ${employeeId} with data:`, data);
    
    // Validasi data dasar
    if (!data.contractType || !data.startDate) {
      return NextResponse.json(
        { success: false, message: 'Contract type and start date are required' },
        { status: 400 }
      );
    }
    
    // Format data untuk service
    const contractData = {
      employee: { connect: { id: employeeId } },
      contractType: data.contractType,
      contractNumber: data.contractNumber,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : null,
      status: data.status,
      notes: data.notes
    };
    
    const contractHistory = await createContractHistory(contractData);
    console.log(`Contract history created successfully:`, contractHistory);
    
    return NextResponse.json({ 
      success: true, 
      data: contractHistory 
    });
  } catch (error: unknown) {
    console.error(`Error in contract history POST:`, error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, message: `Failed to create contract history: ${errorMessage}` },
      { status: 500 }
    );
  }
} 