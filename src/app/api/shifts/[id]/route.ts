import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { 
  deleteShift, 
  getShiftById, 
  updateShift 
} from '@/lib/db/shift.service';

// Schema validasi untuk update shift
const shiftUpdateSchema = z.object({
  name: z.string().min(1, "Nama shift wajib diisi").optional(),
  shiftType: z.enum(['NON_SHIFT', 'SHIFT_A', 'SHIFT_B']).optional(),
  subDepartmentId: z.string().uuid().optional().nullable(),
  mainWorkStart: z.string().or(z.date()).optional(),
  mainWorkEnd: z.string().or(z.date()).optional(),
  lunchBreakStart: z.string().or(z.date()).optional().nullable(),
  lunchBreakEnd: z.string().or(z.date()).optional().nullable(),
  regularOvertimeStart: z.string().or(z.date()).optional().nullable(),
  regularOvertimeEnd: z.string().or(z.date()).optional().nullable(),
  weeklyOvertimeStart: z.string().or(z.date()).optional().nullable(),
  weeklyOvertimeEnd: z.string().or(z.date()).optional().nullable(),
});

// GET: Mendapatkan shift berdasarkan ID
export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const shift = await getShiftById(params.id);
    
    if (!shift) {
      return NextResponse.json(
        { error: 'Shift tidak ditemukan' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(shift);
  } catch (error) {
    console.error('Gagal mendapatkan detail shift:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mendapatkan detail shift' },
      { status: 500 }
    );
  }
}

// PUT: Mengupdate shift berdasarkan ID
export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const id = params.id;
    const data = await request.json();
    
    // Log request data untuk debugging
    console.log('Data update shift yang diterima:', { id, data });
    
    // Validasi input
    const validatedData = shiftUpdateSchema.parse(data);
    
    // Konversi string ke Date jika diperlukan
    const processedData: {
      name?: string;
      shiftType?: 'NON_SHIFT' | 'SHIFT_A' | 'SHIFT_B';
      subDepartmentId?: string | null;
      mainWorkStart?: Date;
      mainWorkEnd?: Date;
      lunchBreakStart?: Date | null;
      lunchBreakEnd?: Date | null;
      regularOvertimeStart?: Date | null;
      regularOvertimeEnd?: Date | null;
      weeklyOvertimeStart?: Date | null;
      weeklyOvertimeEnd?: Date | null;
    } = {
      name: validatedData.name,
      shiftType: validatedData.shiftType,
      subDepartmentId: validatedData.subDepartmentId === "" ? null : validatedData.subDepartmentId,
    };
    
    if (validatedData.mainWorkStart) {
      processedData.mainWorkStart = new Date(validatedData.mainWorkStart);
    }
    
    if (validatedData.mainWorkEnd) {
      processedData.mainWorkEnd = new Date(validatedData.mainWorkEnd);
    }
    
    if (validatedData.lunchBreakStart) {
      processedData.lunchBreakStart = new Date(validatedData.lunchBreakStart);
    } else if (validatedData.lunchBreakStart === null) {
      processedData.lunchBreakStart = null;
    }
    
    if (validatedData.lunchBreakEnd) {
      processedData.lunchBreakEnd = new Date(validatedData.lunchBreakEnd);
    } else if (validatedData.lunchBreakEnd === null) {
      processedData.lunchBreakEnd = null;
    }
    
    if (validatedData.regularOvertimeStart) {
      processedData.regularOvertimeStart = new Date(validatedData.regularOvertimeStart);
    } else if (validatedData.regularOvertimeStart === null) {
      processedData.regularOvertimeStart = null;
    }
    
    if (validatedData.regularOvertimeEnd) {
      processedData.regularOvertimeEnd = new Date(validatedData.regularOvertimeEnd);
    } else if (validatedData.regularOvertimeEnd === null) {
      processedData.regularOvertimeEnd = null;
    }
    
    if (validatedData.weeklyOvertimeStart) {
      processedData.weeklyOvertimeStart = new Date(validatedData.weeklyOvertimeStart);
    } else if (validatedData.weeklyOvertimeStart === null) {
      processedData.weeklyOvertimeStart = null;
    }
    
    if (validatedData.weeklyOvertimeEnd) {
      processedData.weeklyOvertimeEnd = new Date(validatedData.weeklyOvertimeEnd);
    } else if (validatedData.weeklyOvertimeEnd === null) {
      processedData.weeklyOvertimeEnd = null;
    }
    
    console.log('Data shift yang akan diupdate:', processedData);
    
    // Update shift
    const shift = await updateShift(id, processedData);
    
    return NextResponse.json(shift);
  } catch (error) {
    console.error('Gagal mengupdate shift:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validasi gagal', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengupdate shift' },
      { status: 500 }
    );
  }
}

// DELETE: Menghapus shift berdasarkan ID
export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    // Periksa apakah shift ada
    const existingShift = await getShiftById(params.id);
    if (!existingShift) {
      return NextResponse.json(
        { error: 'Shift tidak ditemukan' },
        { status: 404 }
      );
    }
    
    // Periksa apakah shift digunakan oleh karyawan
    if (existingShift._count.employees > 0) {
      return NextResponse.json(
        { 
          error: 'Shift tidak dapat dihapus', 
          message: `Shift ini digunakan oleh ${existingShift._count.employees} karyawan` 
        },
        { status: 400 }
      );
    }
    
    // Hapus shift
    await deleteShift(params.id);
    
    return NextResponse.json({ message: 'Shift berhasil dihapus' });
  } catch (error) {
    console.error('Gagal menghapus shift:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat menghapus shift' },
      { status: 500 }
    );
  }
} 