'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { useUserRole } from '@/hooks/useUserRole';
import { canAccessUrl } from '@/lib/menu-config';

interface RoleBasedPageProtectionProps {
  children: React.ReactNode;
}

// Loading screen component
const PageLoadingScreen = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="flex flex-col items-center space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      <p className="text-gray-600">Memeriksa akses halaman...</p>
    </div>
  </div>
);

// Access denied screen component
const PageAccessDenied = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="text-center max-w-md mx-auto">
      <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-red-100 mb-6">
        <svg
          className="h-10 w-10 text-red-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728"
          />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Akses Ditolak</h1>
      <p className="text-gray-600 mb-6">
        Anda tidak memiliki izin untuk mengakses halaman ini. Hubungi administrator untuk meminta akses.
      </p>
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="text-sm font-medium text-blue-900 mb-2">Informasi Akses:</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• <strong>EMPLOYEE:</strong> Dapat mengakses Dashboard, Absensi, Izin & Cuti</li>
          <li>• <strong>MANAGER:</strong> Dapat mengakses semua menu kecuali Konfigurasi</li>
          <li>• <strong>ADMIN:</strong> Dapat mengakses semua menu dan konfigurasi</li>
        </ul>
      </div>
    </div>
  </div>
);

export function RoleBasedPageProtection({ children }: RoleBasedPageProtectionProps) {
  const pathname = usePathname();
  const { role, isLoading, error } = useUserRole();

  // Show loading while checking role
  if (isLoading) {
    return <PageLoadingScreen />;
  }

  // If there's an error or no role, show access denied
  if (error || !role) {
    console.warn('Role protection: No role found or error occurred', { error, role });
    return <PageAccessDenied />;
  }

  // Check if user can access current URL
  const hasAccess = pathname ? canAccessUrl(pathname, role) : true;

  if (!hasAccess) {
    console.log('Role protection: Access denied', { pathname, role });
    return <PageAccessDenied />;
  }

  // Role check passed, render children
  return <>{children}</>;
}
