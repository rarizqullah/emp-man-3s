import { NextRequest } from 'next/server';
import { prisma, safeQuery } from '@/lib/db';
import { requireAuth, ApiResponse } from '@/lib/auth/api-helpers';

// Define user role type
type UserRole = 'ADMIN' | 'MANAGER' | 'EMPLOYEE';

export const GET = requireAuth(async (request: NextRequest, user) => {
  try {
    // User sudah terautentikasi melalui requireAuth, langsung gunakan data user
    console.log('🔍 Getting user profile for:', user.email);
    
    // Optimized query dengan timeout lebih pendek untuk menghindari timeout
    const userData = await safeQuery(
      () => prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true, // Pastikan role langsung dari database
          employee: {
            select: {
              id: true,
              employeeId: true,
              contractStartDate: true,
              departmentId: true,
              department: {
                select: {
                  name: true
                }
              },
              subDepartment: {
                select: {
                  name: true
                }
              },
              position: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      }),
      1, // Single attempt untuk faster response
      3000 // 3 detik timeout - lebih cepat untuk menghindari timeout
    ) as {
      id: string;
      name: string | null;
      email: string;
      role: UserRole | null;
      employee: {
        id: string;
        employeeId: string;
        contractStartDate: Date;
        departmentId: string;
        department: { name: string } | null;
        subDepartment: { name: string } | null;
        position: { name: string } | null;
      } | null;
    } | null;
    
    if (!userData) {
      console.warn('⚠️ User tidak ditemukan di database:', user.id);
      return ApiResponse.notFound('User tidak ditemukan di database');
    }

    // Enhanced role validation dengan proper null handling
    const validRoles: UserRole[] = ['ADMIN', 'MANAGER', 'EMPLOYEE'];
    let finalRole: UserRole = 'EMPLOYEE'; // Default safe role
    
    if (!userData.role) {
      console.error('❌ User role is null/undefined:', { userId: user.id, email: user.email });
      finalRole = 'EMPLOYEE'; // Safe default tanpa mengubah database
      console.log('⚠️ Using EMPLOYEE as fallback role (no DB update)');
    } else if (!validRoles.includes(userData.role)) {
      console.error('❌ Invalid user role detected:', { 
        userId: user.id, 
        email: user.email, 
        invalidRole: userData.role 
      });
      finalRole = 'EMPLOYEE'; // Safe default tanpa mengubah database
      console.log('⚠️ Using EMPLOYEE as fallback for invalid role (no DB update)');
    } else {
      // Role valid, gunakan sesuai database
      finalRole = userData.role;
      console.log('✅ Valid role from database:', userData.role);
    }
    
    // Log untuk debugging dengan role verification
    console.log('✅ User profile retrieved:', {
      id: userData.id,
      email: userData.email,
      role: userData.role,
      hasEmployee: !!userData.employee,
      roleVerified: true,
      departmentId: userData.employee?.departmentId || null
    });
    
    // Ensure consistent data structure dengan role dari database
    const userResponse = {
      id: userData.id,
      name: userData.name || userData.email?.split('@')[0] || 'User',
      email: userData.email,
      role: finalRole, // Gunakan finalRole yang sudah di-validate
      employee: userData.employee
    };
    
    return ApiResponse.success(userResponse, 'Profil user berhasil dimuat');
    
  } catch (error) {
    console.error('❌ Error fetching user profile:', error);
    
    // Enhanced error handling untuk berbagai kasus
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      
      if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
        return ApiResponse.error('Request timeout. Silakan refresh halaman.', 408);
      }
      
      if (errorMessage.includes('connection') || errorMessage.includes('connect') || 
          errorMessage.includes('network') || errorMessage.includes('fetch failed')) {
        return ApiResponse.error('Connection error. Silakan periksa koneksi internet.', 503);
      }
      
      if (errorMessage.includes('prisma') || errorMessage.includes('database')) {
        return ApiResponse.error('Database error. Silakan coba lagi.', 500);
      }
    }
    
    return ApiResponse.error('Terjadi kesalahan sistem. Silakan coba lagi.', 500);
  }
}); 