import { NextRequest, NextResponse } from "next/server";
import { updateEmployeeShift } from '@/lib/db/employee.service';
import { revalidatePath } from "next/cache";

// PUT /api/employees/[id]/shift-status
// Mengubah status shift karyawan
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Await params terlebih dahulu
    const { id } = await params;
    console.log(`[PUT] /api/employees/${id}/shift-status - Request received`);
    
    const employeeId = id;
    const data = await request.json();
    console.log(`Updating shift for employee ${employeeId} with data:`, data);
    
    // Validasi data dasar
    if (!data.shiftId) {
      return NextResponse.json(
        { success: false, message: 'Shift ID is required' },
        { status: 400 }
      );
    }
    
    const updatedEmployee = await updateEmployeeShift(employeeId, data.shiftId);
    console.log(`Employee shift updated successfully:`, updatedEmployee);
    
    // Revalidasi jalur untuk memperbarui UI
    revalidatePath(`/employees/${employeeId}`);
    revalidatePath('/employees');
    
    return NextResponse.json({ 
      success: true, 
      data: updatedEmployee 
    });
  } catch (error: unknown) {
    console.error(`Error in shift update:`, error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, message: `Failed to update shift: ${errorMessage}` },
      { status: 500 }
    );
  }
} 