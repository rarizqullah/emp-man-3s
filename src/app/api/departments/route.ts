import { NextResponse } from "next/server";
import { z } from "zod";
import { 
  getAllDepartments, 
  createDepartment,
  searchDepartments
} from '@/lib/db/department.service';
import { withCache, invalidateCache } from '@/lib/utils/cache';
import { logger, measurePerformance } from '@/lib/utils/logger';
import { optimizedLogger } from '@/lib/utils/log-optimizer';
import { safeResponse, safeErrorResponse } from '@/lib/utils/stream-handler';

// Cache untuk 5 menit karena departemen jarang berubah
export const revalidate = 300;
export const dynamic = 'force-dynamic'; // Untuk user-specific data

// Schema validasi untuk pembuatan departemen
const departmentCreateSchema = z.object({
  name: z.string().min(1, { message: "Nama departemen wajib diisi" }),
});

// Fungsi untuk mendapatkan semua departemen
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const search = url.searchParams.get('search');
    
    // Optimized logging - no full data payload
    optimizedLogger.debug('GET /api/departments', { search: search || 'none' });
    
    const startTime = Date.now();
    const departments = await (async () => {
      if (search) {
        return await withCache(
          `departments:search:${search}`,
          () => searchDepartments(search),
          180, // 3 minutes cache for search
          '/api/departments'
        );
      }
      
      return await withCache(
        'departments:all',
        () => getAllDepartments(),
        300, // 5 minutes cache for all departments
        '/api/departments'
      );
    })();
    
    const duration = Date.now() - startTime;
    optimizedLogger.performance(`Get departments${search ? ' (search)' : ''}`, duration, { 
      count: departments.length,
      search: search || null
    });
    
    const response = safeResponse(departments);
    // Cache di browser untuk 2 menit
    response.headers.set('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300');
    return response;
  } catch (error) {
    logger.error("Error fetching departments:", error);
    return safeErrorResponse("Terjadi kesalahan saat mengambil data departemen", 500);
  }
}

// Fungsi untuk membuat departemen baru
export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Validasi input
    const validatedData = departmentCreateSchema.parse(data);
    
    // Cek apakah departemen sudah ada
    const existingDepartments = await searchDepartments(validatedData.name);
    const exactMatch = existingDepartments.find(
      dept => dept.name.toLowerCase() === validatedData.name.toLowerCase()
    );
    
    if (exactMatch) {
      return safeErrorResponse("Departemen dengan nama tersebut sudah ada", 400);
    }
    
    // Buat departemen baru
    const department = await createDepartment(validatedData);
    
    // Invalidate cache after creating new department
    invalidateCache.departments();
    logger.info('Department cache invalidated after creation');
    
    return safeResponse(department, { status: 201 });
  } catch (error) {
    console.error('Gagal membuat departemen baru:', error);
    
    if (error instanceof z.ZodError) {
      return safeErrorResponse("Validasi gagal", 400, { details: error.errors });
    }
    
    return safeErrorResponse("Terjadi kesalahan saat membuat departemen", 500);
  }
} 