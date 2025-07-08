import { NextRequest, NextResponse } from 'next/server';
import { updateEmployeeWarningStatus } from '@/lib/db/employee.service';
import { WarningStatus } from '@prisma/client';
import { revalidatePath } from "next/cache";
import { createWarningHistory } from '@/lib/db/employee-history.service';

// PUT /api/employees/[id]/warning-status
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Await params terlebih dahulu
    const { id } = await params;
    console.log(`[PUT] /api/employees/${id}/warning-status - Request received`);
    
    const employeeId = id;
    const data = await request.json();
    console.log(`Updating warning status for employee ${employeeId} with data:`, data);
    
    // Validasi data dasar
    if (!data.warningStatus) {
      return NextResponse.json(
        { success: false, message: 'Status SP wajib diisi' },
        { status: 400 }
      );
    }
    
    // 1. Update status SP karyawan
    const updatedEmployee = await updateEmployeeWarningStatus(employeeId, data.warningStatus as WarningStatus);
    console.log(`Employee warning status updated successfully:`, updatedEmployee);
    
    // 2. Jika data riwayat disediakan, tambahkan juga ke riwayat
    if (data.startDate && data.reason) {
      const historyData = {
        employee: { connect: { id: employeeId } },
        warningStatus: data.warningStatus,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        reason: data.reason,
        attachmentUrl: data.attachmentUrl || null
      };
      
      const warningHistory = await createWarningHistory(historyData);
      console.log(`Warning history created successfully:`, warningHistory);
    }
    
    // Revalidasi jalur untuk memperbarui UI
    revalidatePath(`/employee/${employeeId}`);
    revalidatePath('/employee');
    
    return NextResponse.json({ 
      success: true, 
      data: updatedEmployee 
    });
  } catch (error: unknown) {
    console.error(`Error in warning status update:`, error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, message: `Gagal mengubah status SP: ${errorMessage}` },
      { status: 500 }
    );
  }
} 