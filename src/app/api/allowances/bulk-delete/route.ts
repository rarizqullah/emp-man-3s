import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import * as allowanceService from '@/lib/db/allowance.service';

// Schema validasi untuk bulk delete
const bulkDeleteSchema = z.object({
  allowanceIds: z.array(z.string().min(1, "ID tunjangan tidak valid")).min(1, "Minimal satu tunjangan harus dipilih")
});

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validasi input
    const validatedData = bulkDeleteSchema.parse(data);
    const { allowanceIds } = validatedData;
    
    console.log(`🗑️ Bulk delete request untuk ${allowanceIds.length} tunjangan:`, allowanceIds);
    
    // Cek semua tunjangan yang akan dihapus
    const allowancesToDelete = await Promise.all(
      allowanceIds.map(id => allowanceService.getAllowanceById(id))
    );
    
    // Filter yang tidak ditemukan
    const notFoundIds = allowanceIds.filter((id, index) => !allowancesToDelete[index]);
    
    if (notFoundIds.length > 0) {
      console.log(`❌ Tunjangan tidak ditemukan: ${notFoundIds.join(', ')}`);
      return NextResponse.json(
        { 
          success: false, 
          error: `Tunjangan tidak ditemukan: ${notFoundIds.join(', ')}`,
          notFoundIds
        },
        { status: 404 }
      );
    }
    
    // Cek tunjangan yang masih digunakan oleh karyawan
    const usageChecks = await Promise.all(
      allowanceIds.map(async (id) => {
        const count = await allowanceService.getAllowanceEmployeeCount(id);
        return { id, count };
      })
    );
    
    const allowancesInUse = usageChecks.filter(check => check.count > 0);
    
    if (allowancesInUse.length > 0) {
      const allowanceNames = allowancesToDelete
        .filter((allowance, index) => allowancesInUse.find(inUse => inUse.id === allowanceIds[index]))
        .map(allowance => allowance?.name)
        .filter(Boolean);
        
      console.log(`⚠️ Tunjangan masih digunakan oleh karyawan: ${allowanceNames.join(', ')}`);
      return NextResponse.json(
        { 
          success: false, 
          error: `Tidak dapat menghapus tunjangan yang masih digunakan oleh karyawan: ${allowanceNames.join(', ')}`,
          allowancesInUse: allowancesInUse.map(inUse => ({
            id: inUse.id,
            name: allowancesToDelete.find((allowance, index) => allowanceIds[index] === inUse.id)?.name,
            employeeCount: inUse.count
          }))
        },
        { status: 400 }
      );
    }
    
    // Hapus semua tunjangan (batch delete)
    console.log(`🔥 Menghapus ${allowanceIds.length} tunjangan...`);
    
    const deletedAllowances = await Promise.all(
      allowanceIds.map(id => allowanceService.deleteAllowance(id))
    );
    
    const deletedNames = deletedAllowances.map(allowance => allowance.name);
    
    console.log(`✅ Berhasil menghapus ${deletedAllowances.length} tunjangan: ${deletedNames.join(', ')}`);
    
    return NextResponse.json({
      success: true,
      message: `Berhasil menghapus ${deletedAllowances.length} tunjangan`,
      deletedCount: deletedAllowances.length,
      deletedAllowances: deletedAllowances.map(allowance => ({
        id: allowance.id,
        name: allowance.name
      }))
    });
    
  } catch (error) {
    console.error('❌ Error dalam bulk delete tunjangan:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Data tidak valid', 
          details: error.errors 
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Terjadi kesalahan saat menghapus tunjangan',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
