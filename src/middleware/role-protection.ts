import { NextRequest, NextResponse } from 'next/server';
import { UserRole } from '@/hooks/useUserRole';
import { canAccessUrl } from '@/lib/menu-config';

// Helper untuk ekstrak role dari request headers atau token
async function getUserRoleFromRequest(request: NextRequest): Promise<UserRole | null> {
  try {
    // Ambil role dari header yang sudah di-set oleh middleware auth
    const userRole = request.headers.get('x-user-role');
    if (userRole && ['ADMIN', 'MANAGER', 'EMPLOYEE'].includes(userRole)) {
      return userRole as UserRole;
    }

    // Jika tidak ada di header, coba ambil dari cookie session
    const sessionCookie = request.cookies.get('sb-session');
    if (!sessionCookie) {
      return null;
    }

    // Di sini Anda bisa decode session cookie untuk mendapatkan role
    // Untuk saat ini, return null jika tidak bisa mendapatkan role
    return null;
  } catch (error) {
    console.error('Error getting user role from request:', error);
    return null;
  }
}

// Middleware untuk proteksi role
export async function roleProtectionMiddleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Skip untuk halaman publik
  const publicPaths = ['/login', '/signup', '/forgot-password', '/api/auth'];
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Skip untuk file statis
  if (pathname.includes('/_next/') || pathname.includes('/api/')) {
    return NextResponse.next();
  }

  try {
    // Dapatkan role user
    const userRole = await getUserRoleFromRequest(request);
    
    // Jika tidak ada role, redirect ke login
    if (!userRole) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Cek apakah user dapat mengakses URL ini berdasarkan role
    const hasAccess = canAccessUrl(pathname, userRole);
    
    if (!hasAccess) {
      // Redirect ke halaman tidak diizinkan atau dashboard
      const dashboardUrl = new URL('/dashboard', request.url);
      return NextResponse.redirect(dashboardUrl);
    }

    return NextResponse.next();
  } catch (error) {
    console.error('Role protection middleware error:', error);
    
    // Jika ada error, redirect ke dashboard untuk keamanan
    const dashboardUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(dashboardUrl);
  }
}
