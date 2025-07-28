import { NextRequest } from 'next/server';
import { 
  getContractHistoryByEmployeeId, 
  createContractHistory 
} from '@/lib/db/employee-history.service';
import { requireRole, ApiResponse, canAccessEmployeeData, AuthenticatedUser } from '@/lib/auth/api-helpers';

// GET /api/employees/[id]/contract-history
// Hanya Admin dan Manager yang bisa mengakses riwayat kontrak
export const GET = requireRole(['ADMIN', 'MANAGER'])(async (request: NextRequest, user: AuthenticatedUser) => {
  try {
    // Extract params dari URL - Next.js 13+ App Router approach
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const employeeId = pathSegments[pathSegments.indexOf('employees') + 1];
    
    console.log(`[GET] /api/employees/${employeeId}/contract-history - Request received by ${user.email}`);
    console.log(`Getting contract history for employee: ${employeeId}`);
    
    // Otorisasi: Cek apakah user yang login boleh mengakses data karyawan ini
    const canAccess = await canAccessEmployeeData(user, employeeId);
    if (!canAccess) {
      return ApiResponse.forbidden('Anda tidak memiliki izin untuk mengakses data ini.');
    }
    
    // Langsung query tanpa ensureDatabaseConnection (Prisma menangani koneksi otomatis)
    const contractHistory = await getContractHistoryByEmployeeId(employeeId);
    console.log(`Contract history data fetched for employee: ${employeeId}`);
    
    return ApiResponse.success(contractHistory || []);
  } catch (error: unknown) {
    console.error(`Error in contract history GET:`, error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return ApiResponse.error(`Gagal mendapatkan riwayat kontrak: ${errorMessage}`, 500);
  }
});

// POST /api/employees/[id]/contract-history
// Hanya Admin dan Manager yang bisa membuat riwayat kontrak
export const POST = requireRole(['ADMIN', 'MANAGER'])(async (request: NextRequest, user: AuthenticatedUser) => {
  try {
    // Extract params dari URL
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const employeeId = pathSegments[pathSegments.indexOf('employees') + 1];
    
    console.log(`[POST] /api/employees/${employeeId}/contract-history - Request received by ${user.email}`);
    
    // Otorisasi: Cek apakah user yang login boleh mengubah data karyawan ini
    const canAccess = await canAccessEmployeeData(user, employeeId);
    if (!canAccess) {
      return ApiResponse.forbidden('Anda tidak memiliki izin untuk mengubah data ini.');
    }
    
    const data = await request.json();
    console.log(`Creating contract history for employee ${employeeId} with data:`, data);
    
    // Validasi data dasar
    if (!data.contractType || !data.startDate) {
      return ApiResponse.error('Tipe kontrak dan tanggal mulai wajib diisi', 400);
    }
    
    // Format data untuk service
    const contractData = {
      employee: { connect: { id: employeeId } },
      contractType: data.contractType,
      contractNumber: data.contractNumber,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : null,
      status: data.status,
      notes: data.notes
    };
    
    const contractHistory = await createContractHistory(contractData);
    console.log(`Contract history created successfully:`, contractHistory);
    
    return ApiResponse.success(contractHistory, 'Riwayat kontrak berhasil dibuat');
  } catch (error: unknown) {
    console.error(`Error in contract history POST:`, error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return ApiResponse.error(`Gagal membuat riwayat kontrak: ${errorMessage}`, 500);
  }
}); 