import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { 
  getAllShifts, 
  getShiftsBySubDepartment,
  createShift,
  searchShifts
} from '@/lib/db/shift.service';
import { cacheHelpers, invalidateCache } from '@/lib/utils/cache';

// Schema validasi untuk membuat shift baru
const shiftCreateSchema = z.object({
  name: z.string().min(1, "Nama shift wajib diisi"),
  shiftType: z.enum(['NON_SHIFT', 'SHIFT_A', 'SHIFT_B']),
  subDepartmentId: z.string().uuid().optional().nullable(),
  mainWorkStart: z.string().or(z.date()).optional().nullable(),
  mainWorkEnd: z.string().or(z.date()).optional().nullable(),
  lunchBreakStart: z.string().or(z.date()).optional().nullable(),
  lunchBreakEnd: z.string().or(z.date()).optional().nullable(),
  workingDays: z.array(z.string()).optional().default([]),
  regularOvertimeStart: z.string().or(z.date()).optional().nullable(),
  regularOvertimeEnd: z.string().or(z.date()).optional().nullable(),
  weeklyOvertimeStart: z.string().or(z.date()).optional().nullable(),
  weeklyOvertimeEnd: z.string().or(z.date()).optional().nullable(),
}).refine((data) => {
  // Untuk NON_SHIFT, semua field waktu adalah opsional
  if (data.shiftType === 'NON_SHIFT') {
    return true;
  }
  
  // Untuk SHIFT_A dan SHIFT_B, mainWorkStart dan mainWorkEnd wajib (tidak boleh null atau empty)
  if (data.shiftType === 'SHIFT_A' || data.shiftType === 'SHIFT_B') {
    return data.mainWorkStart !== null && data.mainWorkStart !== undefined && 
           data.mainWorkEnd !== null && data.mainWorkEnd !== undefined;
  }
  
  return true;
}, {
  message: "Jam kerja utama wajib diisi untuk SHIFT_A dan SHIFT_B",
  path: ["mainWorkStart", "mainWorkEnd"]
});

export async function GET(request: NextRequest) {
  try {
    console.log('API /api/shifts dipanggil');
    
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    const subDepartmentId = searchParams.get('subDepartmentId');
    
    console.log('Search params:', { search, subDepartmentId });
    
    let shifts;
    
    // Jika ada parameter pencarian
    if (search) {
      console.log('Mencari shift dengan query:', search);
      shifts = await cacheHelpers.dynamicData(
        `shifts:search:${search}`, 
        () => searchShifts(search)
      );
    }
    // Jika ada parameter subDepartmentId, filter berdasarkan sub departemen
    else if (subDepartmentId) {
      console.log('Mengambil shift untuk subDepartmentId:', subDepartmentId);
      shifts = await cacheHelpers.staticData(
        `shifts:subdept:${subDepartmentId}`,
        () => getShiftsBySubDepartment(subDepartmentId)
      );
    }
    // Jika tidak ada parameter, ambil semua shift
    else {
      console.log('Mengambil semua shift');
      shifts = await cacheHelpers.staticData(
        'shifts:all',
        () => getAllShifts()
      );
    }
    
    console.log(`Berhasil mengambil ${shifts.length} shift`);
    
    const response = NextResponse.json(shifts);
    // Cache di browser untuk 2 menit
    response.headers.set('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300');
    return response;
  } catch (error) {
    console.error('Gagal mengambil data shift:', error);
    
    // Cek apakah error karena koneksi database
    const errorMessage = String(error).toLowerCase();
    if (errorMessage.includes('can\'t reach database server') ||
        errorMessage.includes('connection') ||
        errorMessage.includes('timeout')) {
      return NextResponse.json(
        { 
          error: 'Tidak dapat terhubung ke database. Silakan coba lagi dalam beberapa saat.',
          isConnectionError: true
        },
        { status: 503 }
      );
    }
    
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
      mainWorkStart: validatedData.mainWorkStart ? new Date(validatedData.mainWorkStart) : null,
      mainWorkEnd: validatedData.mainWorkEnd ? new Date(validatedData.mainWorkEnd) : null,
      lunchBreakStart: validatedData.lunchBreakStart ? new Date(validatedData.lunchBreakStart) : null,
      lunchBreakEnd: validatedData.lunchBreakEnd ? new Date(validatedData.lunchBreakEnd) : null,
      workingDays: validatedData.workingDays || [],
      regularOvertimeStart: validatedData.regularOvertimeStart ? new Date(validatedData.regularOvertimeStart) : null,
      regularOvertimeEnd: validatedData.regularOvertimeEnd ? new Date(validatedData.regularOvertimeEnd) : null,
      weeklyOvertimeStart: validatedData.weeklyOvertimeStart ? new Date(validatedData.weeklyOvertimeStart) : null,
      weeklyOvertimeEnd: validatedData.weeklyOvertimeEnd ? new Date(validatedData.weeklyOvertimeEnd) : null,
    };
    
    console.log('Data shift yang akan disimpan:', processedData);
    
    // Buat shift baru
    const shift = await createShift(processedData);
    
    // Invalidate cache after creating new shift
    invalidateCache.shifts();
    console.log('Shift cache invalidated after creation');
    
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
