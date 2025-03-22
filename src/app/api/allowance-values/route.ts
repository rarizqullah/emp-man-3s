import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import * as allowanceValueService from '@/lib/db/allowance-value.service';
import * as allowanceTypeService from '@/lib/db/allowance-type.service';
import * as departmentService from '@/lib/db/department.service';

// Schema validasi untuk pembuatan nilai tunjangan
const allowanceValueCreateSchema = z.object({
  allowanceTypeId: z.string().min(1, { message: "ID tipe tunjangan wajib diisi" }),
  departmentId: z.string().min(1, { message: "ID departemen wajib diisi" }),
  contractType: z.enum(["PERMANENT", "TRAINING"], { 
    message: "Tipe kontrak harus PERMANENT atau TRAINING" 
  }),
  value: z.coerce.number().min(0, { message: "Nilai tunjangan harus minimal 0" }),
  description: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const typeId = searchParams.get('typeId');
    const departmentId = searchParams.get('departmentId');
    const searchTerm = searchParams.get('search');
    
    // Prioritas: pencarian berdasarkan kata kunci
    if (searchTerm) {
      const allowanceValues = await allowanceValueService.searchAllowanceValues(searchTerm);
      return NextResponse.json(allowanceValues);
    }
    
    // Jika ada parameter tipe tunjangan, ambil nilai tunjangan berdasarkan tipe
    if (typeId) {
      const allowanceValues = await allowanceValueService.getAllowanceValuesByType(typeId);
      return NextResponse.json(allowanceValues);
    }
    
    // Jika ada parameter departemen, ambil nilai tunjangan berdasarkan departemen
    if (departmentId) {
      const allowanceValues = await allowanceValueService.getAllowanceValuesByDepartment(departmentId);
      return NextResponse.json(allowanceValues);
    }
    
    // Jika tidak ada parameter, ambil semua nilai tunjangan
    const allowanceValues = await allowanceValueService.getAllAllowanceValues();
    return NextResponse.json(allowanceValues);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil data nilai tunjangan' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validasi input
    const validationResult = allowanceValueCreateSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Data tidak valid', issues: validationResult.error.issues },
        { status: 400 }
      );
    }
    
    const data = validationResult.data;
    
    // Cek apakah tipe tunjangan ada
    const allowanceType = await allowanceTypeService.getAllowanceTypeById(data.allowanceTypeId);
    
    if (!allowanceType) {
      return NextResponse.json(
        { error: 'Tipe tunjangan tidak ditemukan' },
        { status: 404 }
      );
    }
    
    // Cek apakah departemen ada
    const department = await departmentService.getDepartmentById(data.departmentId);
    
    if (!department) {
      return NextResponse.json(
        { error: 'Departemen tidak ditemukan' },
        { status: 404 }
      );
    }
    
    // Cek apakah nilai tunjangan dengan kombinasi yang sama sudah ada
    const isDuplicate = await allowanceValueService.checkAllowanceValueDuplicate(
      data.allowanceTypeId,
      data.departmentId,
      data.contractType
    );
    
    if (isDuplicate) {
      return NextResponse.json(
        { error: 'Nilai tunjangan untuk kombinasi tipe tunjangan, departemen, dan tipe kontrak ini sudah ada' },
        { status: 400 }
      );
    }
    
    // Buat nilai tunjangan baru
    const newAllowanceValue = await allowanceValueService.createAllowanceValue(data);
    
    return NextResponse.json(newAllowanceValue, { status: 201 });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Gagal membuat nilai tunjangan baru' },
      { status: 500 }
    );
  }
} 