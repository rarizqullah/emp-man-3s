'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUserRole, UserRole } from '@/hooks/useUserRole';
import { canAccessUrl } from '@/lib/menu-config';

interface WithRoleProtectionProps {
  allowedRoles?: UserRole | UserRole[];
  fallbackUrl?: string;
  children: React.ReactNode;
}

// Loading component
const LoadingScreen = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="flex flex-col items-center space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      <p className="text-gray-600">Memeriksa akses...</p>
    </div>
  </div>
);

// Access denied component
const AccessDenied = ({ onRedirect }: { onRedirect: () => void }) => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100">
        <svg
          className="h-8 w-8 text-red-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.502 0L4.312 15.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
      </div>
      <h1 className="mt-4 text-xl font-semibold text-gray-900">Akses Ditolak</h1>
      <p className="mt-2 text-gray-600">
        Anda tidak memiliki izin untuk mengakses halaman ini.
      </p>
      <button
        onClick={onRedirect}
        className="mt-4 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
      >
        Kembali ke Dashboard
      </button>
    </div>
  </div>
);

// HOC untuk proteksi role
export function withRoleProtection<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: {
    allowedRoles?: UserRole | UserRole[];
    fallbackUrl?: string;
  } = {}
) {
  const { allowedRoles, fallbackUrl = '/dashboard' } = options;

  return function ProtectedComponent(props: P) {
    const { user, role, isLoading, error } = useUserRole();
    const router = useRouter();
    const [accessChecked, setAccessChecked] = useState(false);
    const [hasAccess, setHasAccess] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      if (isLoading) return;

      // Jika ada error atau tidak ada user, redirect ke login
      if (error || !user || !role) {
        router.push('/login');
        return;
      }

      // Cek apakah user memiliki role yang diizinkan
      let roleAccess = true;
      if (allowedRoles) {
        const allowed = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
        roleAccess = allowed.includes(role);
      }

      // Cek apakah user dapat mengakses URL saat ini berdasarkan konfigurasi menu
      const currentPath = window.location.pathname;
      const urlAccess = canAccessUrl(currentPath, role);

      const finalAccess = roleAccess && urlAccess;
      
      setHasAccess(finalAccess);
      setAccessChecked(true);

      // Jika tidak memiliki akses, redirect ke fallback URL dengan delay
      if (!finalAccess) {
        timeoutRef.current = setTimeout(() => {
          router.push(fallbackUrl);
        }, 2000);
      }

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }, [user, role, isLoading, error, router]);

    // Loading state
    if (isLoading || !accessChecked) {
      return <LoadingScreen />;
    }

    // Access denied state
    if (!hasAccess) {
      return (
        <AccessDenied 
          onRedirect={() => router.push(fallbackUrl)} 
        />
      );
    }

    // Render component jika memiliki akses
    return <WrappedComponent {...props} />;
  };
}

// Komponen proteksi yang lebih sederhana untuk digunakan langsung
export function RoleProtection({ 
  allowedRoles, 
  fallbackUrl = '/dashboard', 
  children 
}: WithRoleProtectionProps) {
  const { user, role, isLoading, error } = useUserRole();
  const router = useRouter();

  // Render early returns
  if (isLoading) {
    return <LoadingScreen />;
  }

  if (error || !user || !role) {
    router.push('/login');
    return <LoadingScreen />;
  }

  if (allowedRoles) {
    const allowed = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    if (!allowed.includes(role)) {
      router.push(fallbackUrl);
      return (
        <AccessDenied 
          onRedirect={() => router.push(fallbackUrl)} 
        />
      );
    }
  }

  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
  const urlAccess = canAccessUrl(currentPath, role);
  
  if (!urlAccess) {
    router.push(fallbackUrl);
    return (
      <AccessDenied 
        onRedirect={() => router.push(fallbackUrl)} 
      />
    );
  }

  return <>{children}</>;
}
