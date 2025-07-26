import { NextRequest, NextResponse } from 'next/server';
import { UserRole } from '@/hooks/useUserRole';
import { canAccessUrl } from '@/lib/menu-config';

// Konfigurasi rute dan role yang dibutuhkan
export const ROUTE_PERMISSIONS = {
  // Public routes - tidak memerlukan autentikasi
  PUBLIC_ROUTES: [
    '/login',
    '/signup',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/',
  ],
  
  // Protected routes - memerlukan autentikasi tapi semua role bisa akses
  PROTECTED_ROUTES: [
    '/dashboard',
    '/attendance',
    '/permission',
  ],
  
  // Admin only routes
  ADMIN_ONLY_ROUTES: [
    '/configuration',
    '/configuration/departments',
    '/configuration/sub-departments',
    '/configuration/positions',
    '/configuration/shifts',
    '/configuration/salary-rates',
    '/configuration/allowances',
    '/admin',
  ],
  
  // Admin and Manager routes
  ADMIN_MANAGER_ROUTES: [
    '/employee',
    '/salary',
    '/reports',
  ],
} as const;

// Helper untuk mengecek apakah rute adalah public
export const isPublicRoute = (pathname: string): boolean => {
  return ROUTE_PERMISSIONS.PUBLIC_ROUTES.some(route => 
    pathname === route || (route !== '/' && pathname.startsWith(route))
  );
};

// Helper untuk mengecek apakah rute memerlukan role admin
export const isAdminOnlyRoute = (pathname: string): boolean => {
  return ROUTE_PERMISSIONS.ADMIN_ONLY_ROUTES.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  );
};

// Helper untuk mengecek apakah rute memerlukan role admin atau manager
export const isAdminManagerRoute = (pathname: string): boolean => {
  return ROUTE_PERMISSIONS.ADMIN_MANAGER_ROUTES.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  );
};

// Main function untuk mengecek permission
export const checkRoutePermission = (pathname: string, userRole: UserRole | null): boolean => {
  // Public routes selalu dapat diakses
  if (isPublicRoute(pathname)) {
    return true;
  }
  
  // Jika tidak ada role (belum login), hanya bisa akses public routes
  if (!userRole) {
    return false;
  }
  
  // Admin bisa akses semua
  if (userRole === 'ADMIN') {
    return true;
  }
  
  // Cek admin-only routes
  if (isAdminOnlyRoute(pathname)) {
    return false; // Hanya admin yang bisa, tapi userRole bukan admin
  }
  
  // Cek admin-manager routes
  if (isAdminManagerRoute(pathname)) {
    return userRole === 'MANAGER'; // Manager bisa akses, employee tidak
  }
  
  // Gunakan konfigurasi menu untuk rute lainnya
  return canAccessUrl(pathname, userRole);
};

// Helper untuk mendapatkan redirect URL berdasarkan role
export const getDefaultRedirectUrl = (userRole: UserRole): string => {
  switch (userRole) {
    case 'ADMIN':
      return '/dashboard';
    case 'MANAGER':
      return '/dashboard';
    case 'EMPLOYEE':
      return '/attendance'; // Employee diarahkan langsung ke attendance
    default:
      return '/dashboard';
  }
};

// Helper untuk membuat response redirect dengan pesan error
export const createUnauthorizedResponse = (
  request: NextRequest,
  reason: 'unauthenticated' | 'insufficient_permissions' = 'insufficient_permissions'
): NextResponse => {
  const loginUrl = new URL('/login', request.url);
  
  // Tambahkan parameter untuk debugging
  loginUrl.searchParams.set('redirect_to', request.nextUrl.pathname);
  loginUrl.searchParams.set('error', reason);
  
  if (reason === 'insufficient_permissions') {
    loginUrl.searchParams.set('message', 'Anda tidak memiliki izin untuk mengakses halaman ini');
  } else {
    loginUrl.searchParams.set('message', 'Silakan login terlebih dahulu');
  }
  
  return NextResponse.redirect(loginUrl);
};

// Helper untuk log access attempts (untuk debugging)
export const logRouteAccess = (
  pathname: string, 
  userRole: UserRole | null, 
  allowed: boolean,
  userId?: string
): void => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔐 Route Access: ${pathname}`, {
      userRole,
      userId,
      allowed,
      timestamp: new Date().toISOString(),
    });
  }
};
