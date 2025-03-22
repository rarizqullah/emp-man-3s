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
    
    const warningHistory = await getWarningHistoryByEmployeeId(employeeId);
    console.log(`Warning history data fetched: ${JSON.stringify(warningHistory)}`);
    
    return NextResponse.json({ 
      success: true, 
      data: warningHistory || [] 
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Error in warning history GET:`, error);
    return NextResponse.json(
      { success: false, message: `Failed to get warning history: ${errorMessage}` },
      { status: 500 }
    );
  }
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
    
    const warningHistory = await createWarningHistory(warningData);
    console.log(`Warning history created successfully:`, warningHistory);
    
    return NextResponse.json({ 
      success: true, 
      data: warningHistory 
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Error in warning history POST:`, error);
    return NextResponse.json(
      { success: false, message: `Failed to create warning history: ${errorMessage}` },
      { status: 500 }
    );
  }
} 