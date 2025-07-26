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
    // Coba dapatkan dari Supabase session terlebih dahulu
    const supabase = await createServerSupabaseClient();
    
    // Add timeout for auth session check - increased from 5s to 10s
    const sessionPromise = supabase.auth.getSession();
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Auth session timeout')), 10000) // Increased from 5s to 10s
    );
    
    const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]);
    
    if (session?.user) {
      // Ambil data lengkap user dari database berdasarkan email dengan safeQuery
      const user = await safeQuery(
        () => prisma.user.findUnique({
          where: { email: session.user.email! },
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
        2, // max retries
        8000 // 8 second timeout - increased from 5s
      );

      if (user) {
        return {
          id: user.id,
          email: user.email,
          name: user.name || user.email.split('@')[0],
          role: user.role as UserRole,
          employeeId: user.employee?.id
        };
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
        2, // max retries
        8000 // 8 second timeout - increased from 5s
      );

      if (user) {
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
    console.error('Error getting user from request:', error);
    
    // Log specific error types for debugging
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        console.error('Auth timeout:', error.message);
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
    
    return handler(request, user);
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
