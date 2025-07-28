'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useUserRole } from '@/hooks/useUserRole';
import { canAccessUrl } from '@/lib/menu-config';
import { getDefaultRedirectUrl } from '@/lib/route-protection';

interface RoleBasedPageProtectionProps {
  children: React.ReactNode;
}

export default function RoleBasedPageProtection({ children }: RoleBasedPageProtectionProps) {
  const { user, role, isLoading } = useUserRole();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // Jika loading selesai dan ada user dengan role dan pathname valid
    if (!isLoading && user && role && pathname) {
      // Periksa apakah user memiliki akses ke URL saat ini
      if (!canAccessUrl(pathname, role)) {
        // Redirect ke halaman default berdasarkan role
        const redirectUrl = getDefaultRedirectUrl(role);
        router.replace(redirectUrl);
        return;
      }
    }
  }, [isLoading, user, role, pathname, router]);

  // Tampilkan loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Memuat...</span>
      </div>
    );
  }

  // Jika tidak ada user, biarkan layout menangani redirect ke login
  if (!user || !role) {
    return null;
  }

  // Pastikan pathname valid sebelum memeriksa akses
  if (!pathname) {
    return null;
  }

  // Jika user memiliki akses, tampilkan konten
  if (canAccessUrl(pathname, role)) {
    return <>{children}</>;
  }

  // Jika tidak memiliki akses, tampilkan loading sementara redirect
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <span className="ml-2">Mengalihkan...</span>
    </div>
  );
}
