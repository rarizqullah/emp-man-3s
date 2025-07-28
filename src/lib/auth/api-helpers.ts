import { NextRequest } from 'next/server';
import { UserRole } from '@/hooks/useUserRole';
import { prisma, safeQuery } from '@/lib/db';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// Interface untuk user yang terautentikasi
export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  employeeId?: string;
}

// Helper untuk mendapatkan user dari Supabase session
export async function getUserFromRequest(request: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    // Menggunakan getUser() yang aman untuk verifikasi auth state
    const supabase = await createServerSupabaseClient();
    
    // Extended timeout for auth user check sesuai dokumentasi
    const userPromise = supabase.auth.getUser();
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Auth user timeout')), 10000) // 10s timeout sesuai dokumentasi
    );
    
    const { data: { user: authUser }, error } = await Promise.race([userPromise, timeoutPromise]);
    
    if (error) {
      console.warn('❌ Auth user verification failed:', error.message);
      return null;
    }
    
    if (authUser?.email) {
      // Ambil data lengkap user dari database berdasarkan email dengan safeQuery
      const user = await safeQuery(
        () => prisma.user.findUnique({
          where: { email: authUser.email! },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            employee: {
              select: {
                id: true,
                employeeId: true
              }
            }
          }
        }),
        3, // restored retries untuk stability
        10000 // extended timeout untuk stability - 10 second sesuai dokumentasi
      );

      if (user) {
        // Validate role consistency
        if (!user.role || !['ADMIN', 'MANAGER', 'EMPLOYEE'].includes(user.role)) {
          console.error('❌ Invalid user role in auth helper:', user.role);
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name || user.email.split('@')[0],
          role: user.role as UserRole,
          employeeId: user.employee?.id
        };
      } else {
        // User tidak ada di database, coba buat otomatis jika memungkinkan
        console.warn('⚠️ User ada di Supabase tapi tidak di database:', authUser.email);
        
        try {
          // Coba buat user baru dengan data minimal
          const newUser = await prisma.user.create({
            data: {
              email: authUser.email!,
              name: authUser.user_metadata?.name || authUser.email!.split('@')[0],
              authId: authUser.id,
              role: 'EMPLOYEE' // Default role
            }
          });
          
          console.log('✅ Auto-created missing user:', newUser.email);
          
          return {
            id: newUser.id,
            email: newUser.email,
            name: newUser.name,
            role: newUser.role as UserRole,
            employeeId: undefined
          };
        } catch (createError) {
          console.error('❌ Failed to auto-create user:', createError);
          return null;
        }
      }
    }

    // Fallback: Ambil dari header jika ada (dari middleware lain)
    const userId = request.headers.get('x-user-id');
    const userEmail = request.headers.get('x-user-email');
    const userRole = request.headers.get('x-user-role') as UserRole;

    if (userId && userEmail && userRole) {
      // Ambil data lengkap user dari database dengan safeQuery
      const user = await safeQuery(
        () => prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            employee: {
              select: {
                id: true,
                employeeId: true
              }
            }
          }
        }),
        3, // restored retries untuk stability
        10000 // extended timeout - 10 second sesuai dokumentasi
      );

      if (user) {
        // Validate role consistency
        if (!user.role || !['ADMIN', 'MANAGER', 'EMPLOYEE'].includes(user.role)) {
          console.error('❌ Invalid user role in fallback auth:', user.role);
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name || user.email.split('@')[0],
          role: user.role as UserRole,
          employeeId: user.employee?.id
        };
      }
    }

    return null;
  } catch (error) {
    console.error('❌ Error getting user from request:', error);
    
    // Log specific error types for debugging
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        console.error('🕐 Auth timeout:', error.message);
      } else if (error.message.includes('connection')) {
        console.error('🔌 Database connection error:', error.message);
      } else if (error.message.includes('not found')) {
        console.error('👤 User not found error:', error.message);
      } else {
        console.error('🔥 Unexpected auth error:', error.message);
      }
    }
    
    return null;
  }
}

// Helper untuk cek apakah user memiliki role tertentu
export function hasRole(user: AuthenticatedUser | null, allowedRoles: UserRole | UserRole[]): boolean {
  if (!user) return false;
  
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  return roles.includes(user.role);
}

// Helper untuk cek apakah user adalah admin
export function isAdmin(user: AuthenticatedUser | null): boolean {
  return hasRole(user, 'ADMIN');
}

// Helper untuk cek apakah user adalah manager
export function isManager(user: AuthenticatedUser | null): boolean {
  return hasRole(user, 'MANAGER');
}

// Helper untuk cek apakah user dapat mengelola karyawan
export function canManageEmployees(user: AuthenticatedUser | null): boolean {
  return hasRole(user, ['ADMIN', 'MANAGER']);
}

// Helper untuk cek apakah user dapat mengakses data karyawan tertentu
export async function canAccessEmployeeData(
  user: AuthenticatedUser | null, 
  targetEmployeeId: string
): Promise<boolean> {
  if (!user) return false;
  
  // Admin dapat mengakses semua data
  if (user.role === 'ADMIN') return true;
  
  // User hanya dapat mengakses data dirinya sendiri
  if (user.employeeId === targetEmployeeId) return true;
  
  // Manager dapat mengakses data karyawan di departemennya
  if (user.role === 'MANAGER' && user.employeeId) {
    try {
      const managerEmployee = await prisma.employee.findUnique({
        where: { id: user.employeeId },
        select: { departmentId: true }
      });
      
      const targetEmployee = await prisma.employee.findUnique({
        where: { id: targetEmployeeId },
        select: { departmentId: true }
      });
      
      return managerEmployee?.departmentId === targetEmployee?.departmentId;
    } catch (error) {
      console.error('Error checking department access:', error);
      return false;
    }
  }
  
  return false;
}

// Decorator untuk API routes yang memerlukan autentikasi
export function requireAuth(handler: (request: NextRequest, user: AuthenticatedUser) => Promise<Response>) {
  return async (request: NextRequest): Promise<Response> => {
    try {
      const user = await getUserFromRequest(request);
      
      if (!user) {
        console.warn('❌ Unauthorized access attempt');
        return new Response(
          JSON.stringify({ 
            error: 'Unauthorized', 
            message: 'Login diperlukan untuk mengakses endpoint ini' 
          }),
          { 
            status: 401, 
            headers: { 'Content-Type': 'application/json' } 
          }
        );
      }

      // Validate role consistency before proceeding
      if (!user.role || !['ADMIN', 'MANAGER', 'EMPLOYEE'].includes(user.role)) {
        console.error('❌ Invalid user role in requireAuth:', user.role);
        return new Response(
          JSON.stringify({ 
            error: 'Forbidden', 
            message: 'Role user tidak valid' 
          }),
          { 
            status: 403, 
            headers: { 'Content-Type': 'application/json' } 
          }
        );
      }
      
      return handler(request, user);
    } catch (error) {
      console.error('❌ Error in requireAuth:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Internal Server Error', 
          message: 'Terjadi kesalahan autentikasi' 
        }),
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
  };
}

// Decorator untuk API routes yang memerlukan role tertentu
export function requireRole(allowedRoles: UserRole | UserRole[]) {
  return function(handler: (request: NextRequest, user: AuthenticatedUser) => Promise<Response>) {
    return async (request: NextRequest): Promise<Response> => {
      const user = await getUserFromRequest(request);
      
      if (!user) {
        return new Response(
          JSON.stringify({ 
            error: 'Unauthorized', 
            message: 'Login diperlukan untuk mengakses endpoint ini' 
          }),
          { 
            status: 401, 
            headers: { 'Content-Type': 'application/json' } 
          }
        );
      }
      
      if (!hasRole(user, allowedRoles)) {
        const roleNames = Array.isArray(allowedRoles) ? allowedRoles.join(', ') : allowedRoles;
        return new Response(
          JSON.stringify({ 
            error: 'Forbidden', 
            message: `Role ${roleNames} diperlukan untuk mengakses endpoint ini` 
          }),
          { 
            status: 403, 
            headers: { 'Content-Type': 'application/json' } 
          }
        );
      }
      
      return handler(request, user);
    };
  };
}

// Helper untuk API response yang konsisten
export const ApiResponse = {
  success: (data: unknown, message?: string) => {
    return Response.json({
      success: true,
      message: message || 'Request berhasil',
      data
    });
  },
  
  error: (message: string, status: number = 400, details?: unknown) => {
    return Response.json({
      success: false,
      error: message,
      details
    }, { status });
  },
  
  unauthorized: (message: string = 'Unauthorized') => {
    return Response.json({
      success: false,
      error: message
    }, { status: 401 });
  },
  
  forbidden: (message: string = 'Forbidden') => {
    return Response.json({
      success: false,
      error: message
    }, { status: 403 });
  },
  
  notFound: (message: string = 'Data tidak ditemukan') => {
    return Response.json({
      success: false,
      error: message
    }, { status: 404 });
  }
};

// Contoh penggunaan dalam API route
/*
// pages/api/employees/route.ts
import { requireRole, ApiResponse } from '@/lib/auth/api-helpers';

// Hanya admin dan manager yang bisa akses endpoint ini
export const GET = requireRole(['ADMIN', 'MANAGER'])(async (request, user) => {
  try {
    const employees = await prisma.employee.findMany();
    return ApiResponse.success(employees);
  } catch (error) {
    return ApiResponse.error('Gagal mengambil data karyawan');
  }
});

// pages/api/profile/route.ts
import { requireAuth, ApiResponse } from '@/lib/auth/api-helpers';

// Semua user yang login bisa akses
export const GET = requireAuth(async (request, user) => {
  try {
    return ApiResponse.success(user);
  } catch (error) {
    return ApiResponse.error('Gagal mengambil profil user');
  }
});
*/
