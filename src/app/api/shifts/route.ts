import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { 
  getAllShifts, 
  getShiftsBySubDepartment,
  createShift,
  searchShifts
} from '@/lib/db/shift.service';

// Schema validasi untuk membuat shift baru
const shiftCreateSchema = z.object({
  name: z.string().min(1, "Nama shift wajib diisi"),
  shiftType: z.enum(['NON_SHIFT', 'SHIFT_A', 'SHIFT_B']),
  // Hapus sementara
  subDepartmentId: z.string().uuid().optional().nullable(),
  mainWorkStart: z.string().or(z.date()),
  mainWorkEnd: z.string().or(z.date()),
  lunchBreakStart: z.string().or(z.date()).optional().nullable(),
  lunchBreakEnd: z.string().or(z.date()).optional().nullable(),
  regularOvertimeStart: z.string().or(z.date()).optional().nullable(),
  regularOvertimeEnd: z.string().or(z.date()).optional().nullable(),
  weeklyOvertimeStart: z.string().or(z.date()).optional().nullable(),
  weeklyOvertimeEnd: z.string().or(z.date()).optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    const subDepartmentId = searchParams.get('subDepartmentId');
    
    // Jika ada parameter pencarian
    if (search) {
      const shifts = await searchShifts(search);
      return NextResponse.json(shifts);
    }
    
    // Jika ada parameter subDepartmentId, filter berdasarkan sub departemen
    if (subDepartmentId) {
      const shifts = await getShiftsBySubDepartment(subDepartmentId);
      return NextResponse.json(shifts);
    }
    
    // Jika tidak ada parameter, ambil semua shift
    const shifts = await getAllShifts();
    return NextResponse.json(shifts);
  } catch (error) {
    console.error('Gagal mengambil data shift:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengambil data shift' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Log request data untuk debugging
    console.log('Data shift yang diterima:', data);
    
    // Validasi input
    const validatedData = shiftCreateSchema.parse(data);
    
    // Konversi string ke Date jika diperlukan
    const processedData = {
      ...validatedData,
      subDepartmentId: validatedData.subDepartmentId || null,
      mainWorkStart: new Date(validatedData.mainWorkStart),
      mainWorkEnd: new Date(validatedData.mainWorkEnd),
      lunchBreakStart: validatedData.lunchBreakStart ? new Date(validatedData.lunchBreakStart) : null,
      lunchBreakEnd: validatedData.lunchBreakEnd ? new Date(validatedData.lunchBreakEnd) : null,
      regularOvertimeStart: validatedData.regularOvertimeStart ? new Date(validatedData.regularOvertimeStart) : null,
      regularOvertimeEnd: validatedData.regularOvertimeEnd ? new Date(validatedData.regularOvertimeEnd) : null,
      weeklyOvertimeStart: validatedData.weeklyOvertimeStart ? new Date(validatedData.weeklyOvertimeStart) : null,
      weeklyOvertimeEnd: validatedData.weeklyOvertimeEnd ? new Date(validatedData.weeklyOvertimeEnd) : null,
    };
    
    console.log('Data shift yang akan disimpan:', processedData);
    
    // Buat shift baru
    const shift = await createShift(processedData);
    
    return NextResponse.json(shift, { status: 201 });
  } catch (error) {
    console.error('Gagal membuat shift baru:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validasi gagal', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat membuat shift' },
      { status: 500 }
    );
  }
} 