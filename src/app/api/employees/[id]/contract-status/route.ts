import { NextRequest, NextResponse } from 'next/server';
import { updateEmployeeContract } from '@/lib/db/employee.service';
import { ContractType } from '@prisma/client';
import { revalidatePath } from "next/cache";
import { createContractHistory } from '@/lib/db/employee-history.service';

// PUT /api/employees/[id]/contract-status
// Mengubah status kontrak karyawan dan menambahkan riwayat
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Await params terlebih dahulu
    const { id } = await params;
    console.log(`[PUT] /api/employees/${id}/contract-status - Request received`);
    
    const employeeId = id;
    const data = await request.json();
    console.log(`Updating contract status for employee ${employeeId} with data:`, data);
    
    // Validasi data dasar
    if (!data.contractType || !data.startDate) {
      return NextResponse.json(
        { success: false, message: 'Tipe kontrak dan tanggal mulai wajib diisi' },
        { status: 400 }
      );
    }
    
    // 1. Update kontrak karyawan
    const contractData = {
      contractType: data.contractType as ContractType,
      contractNumber: data.contractNumber || null,
      contractStartDate: new Date(data.startDate),
      contractEndDate: data.endDate ? new Date(data.endDate) : null
    };
    
    const updatedEmployee = await updateEmployeeContract(employeeId, contractData);
    console.log(`Employee contract updated successfully:`, updatedEmployee);
    
    // 2. Simpan riwayat kontrak
    const historyData = {
      employee: { connect: { id: employeeId } },
      contractType: data.contractType,
      contractNumber: data.contractNumber || null,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : null,
      status: data.status || 'ACTIVE',
      notes: data.notes || null
    };
    
    const contractHistory = await createContractHistory(historyData);
    console.log(`Contract history created successfully:`, contractHistory);
    
    // Revalidasi jalur untuk memperbarui UI
    revalidatePath(`/employee/${employeeId}`);
    revalidatePath('/employee');
    
    return NextResponse.json({ 
      success: true, 
      data: {
        employee: updatedEmployee,
        history: contractHistory
      }
    });
  } catch (error: unknown) {
    console.error(`Error in contract status update:`, error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, message: `Gagal memperbarui kontrak: ${errorMessage}` },
      { status: 500 }
    );
  }
} 