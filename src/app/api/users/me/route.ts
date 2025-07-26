import { NextRequest } from 'next/server';
import { prisma, safeQuery } from '@/lib/db';
import { requireAuth, ApiResponse } from '@/lib/auth/api-helpers';

export const GET = requireAuth(async (request: NextRequest, user) => {
  try {
    // User sudah terautentikasi melalui requireAuth, langsung gunakan data user
    console.log('🔍 Getting user profile for:', user.email);
    
    // Dapatkan data lengkap user dari database dengan safeQuery untuk timeout protection
    const userData = await safeQuery(
      () => prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          employee: {
            select: {
              id: true,
              employeeId: true,
              contractStartDate: true,
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
      3, // max retries
      12000 // 12 second timeout - increased from 8s
    );
    
    if (!userData) {
      return ApiResponse.notFound('User tidak ditemukan di database');
    }
    
    // Log untuk debugging
    console.log('✅ User profile retrieved:', {
      id: userData.id,
      email: userData.email,
      role: userData.role,
      hasEmployee: !!userData.employee
    });
    
    return ApiResponse.success(userData, 'Profil user berhasil dimuat');
    
  } catch (error) {
    console.error('❌ Error fetching user profile:', error);
    
    // Return more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        return ApiResponse.error('Request timeout. Silakan coba lagi.', 408);
      }
      if (error.message.includes('connection')) {
        return ApiResponse.error('Database connection error. Silakan coba lagi.', 503);
      }
    }
    
    return ApiResponse.error('Terjadi kesalahan saat memuat profil user', 500);
  }
}); 