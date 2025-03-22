import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

// PUT /api/employees/[id]/warning-status
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log(`[PUT] /api/employees/${params.id}/warning-status - Request received`);
    
    const employeeId = params.id;
    const data = await request.json();
    console.log(`Updating warning status for employee ${employeeId} with data:`, data);
    
    // Validasi data
    if (!data.warningStatus) {
      console.error(`Validation failed: warningStatus is required`);
      return NextResponse.json(
        { success: false, message: 'Warning status is required' },
        { status: 400 }
      );
    }
    
    // Validasi nilai warningStatus
    const validStatuses = ["NONE", "SP1", "SP2", "SP3"];
    if (!validStatuses.includes(data.warningStatus)) {
      console.error(`Validation failed: warningStatus must be one of ${validStatuses.join(", ")}, received: ${data.warningStatus}`);
      return NextResponse.json(
        { success: false, message: `Warning status must be one of ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }
    
    // Update status peringatan karyawan
    const employee = await prisma.employee.update({
      where: { id: employeeId },
      data: {
        warningStatus: data.warningStatus
      },
      select: {
        id: true,
        employeeId: true,
        warningStatus: true,
        user: {
          select: {
            name: true
          }
        }
      }
    });
    
    console.log(`Employee warning status updated successfully:`, employee);
    
    return NextResponse.json({ 
      success: true, 
      data: employee 
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Error in employee warning status update:`, error);
    return NextResponse.json(
      { success: false, message: `Failed to update warning status: ${errorMessage}` },
      { status: 500 }
    );
  }
} 