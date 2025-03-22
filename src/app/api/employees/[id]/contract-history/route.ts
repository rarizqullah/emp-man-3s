import { NextRequest, NextResponse } from 'next/server';
import { 
  getContractHistoryByEmployeeId, 
  createContractHistory 
} from '@/lib/db/employee-history.service';

// GET /api/employees/[id]/contract-history
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log(`[GET] /api/employees/${params.id}/contract-history - Request received`);
    
    const employeeId = params.id;
    console.log(`Getting contract history for employee: ${employeeId}`);
    
    const contractHistory = await getContractHistoryByEmployeeId(employeeId);
    console.log(`Contract history data fetched: ${JSON.stringify(contractHistory)}`);
    
    return NextResponse.json({ 
      success: true, 
      data: contractHistory || [] 
    });
  } catch (error: any) {
    console.error(`Error in contract history GET:`, error);
    return NextResponse.json(
      { success: false, message: `Failed to get contract history: ${error.message}` },
      { status: 500 }
    );
  }
}

// POST /api/employees/[id]/contract-history
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log(`[POST] /api/employees/${params.id}/contract-history - Request received`);
    
    const employeeId = params.id;
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
  } catch (error: any) {
    console.error(`Error in contract history POST:`, error);
    return NextResponse.json(
      { success: false, message: `Failed to create contract history: ${error.message}` },
      { status: 500 }
    );
  }
} 