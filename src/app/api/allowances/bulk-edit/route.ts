import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import * as allowanceService from '@/lib/db/allowance.service';

// Schema validasi untuk bulk edit
const bulkEditSchema = z.object({
  allowanceIds: z.array(z.string().min(1, "ID tunjangan tidak valid")).min(1, "Minimal satu tunjangan harus dipilih"),
  updates: z.object({
    umkAmount: z.coerce.number().min(0).optional(),
    companyPercentage: z.coerce.number().min(0).max(100).optional(),
    employeePercentage: z.coerce.number().min(0).max(100).optional(),
  }).refine(
    (data) => Object.values(data).some(value => value !== undefined),
    "Minimal satu field harus diisi untuk update"
  )
});

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validasi input
    const validatedData = bulkEditSchema.parse(data);
    const { allowanceIds, updates } = validatedData;
    
    console.log(`📝 Bulk edit request untuk ${allowanceIds.length} tunjangan:`, allowanceIds);
    console.log(`Updates:`, updates);
    
    // Cek semua tunjangan yang akan diupdate
    const allowancesToUpdate = await Promise.all(
      allowanceIds.map(id => allowanceService.getAllowanceById(id))
    );
    
    // Filter yang tidak ditemukan
    const notFoundIds = allowanceIds.filter((id, index) => !allowancesToUpdate[index]);
    
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
    
    // Validasi persentase total jika kedua persentase diupdate
    if (updates.companyPercentage !== undefined && updates.employeePercentage !== undefined) {
      const totalPercentage = updates.companyPercentage + updates.employeePercentage;
      if (totalPercentage > 100) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Total persentase (${totalPercentage}%) tidak boleh melebihi 100%`,
          },
          { status: 400 }
        );
      }
    }
    
    // Update semua tunjangan
    console.log(`📝 Mengupdate ${allowanceIds.length} tunjangan...`);
    
    const updatedAllowances = await Promise.all(
      allowanceIds.map(id => allowanceService.updateAllowance(id, updates))
    );
    
    const updatedNames = updatedAllowances.map(allowance => allowance.name);
    
    console.log(`✅ Berhasil mengupdate ${updatedAllowances.length} tunjangan: ${updatedNames.join(', ')}`);
    
    return NextResponse.json({
      success: true,
      message: `Berhasil mengupdate ${updatedAllowances.length} tunjangan`,
      updatedCount: updatedAllowances.length,
      updatedAllowances: updatedAllowances.map(allowance => ({
        id: allowance.id,
        name: allowance.name,
        umkAmount: allowance.umkAmount,
        companyPercentage: allowance.companyPercentage,
        employeePercentage: allowance.employeePercentage,
        companyAmount: allowance.companyAmount,
        employeeAmount: allowance.employeeAmount
      }))
    });
    
  } catch (error) {
    console.error('❌ Error dalam bulk edit tunjangan:', error);
    
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
        error: 'Terjadi kesalahan saat mengupdate tunjangan',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
