'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useUserRole, UserRole } from '@/hooks/useUserRole';
import { checkRoutePermission, getDefaultRedirectUrl, logRouteAccess } from '@/lib/route-protection';
import { AccessDenied, LoginRequired } from '@/components/access-denied';

interface WithRoleProtectionOptions {
  requiredRoles?: UserRole | UserRole[];
  redirectTo?: string;
  showAccessDenied?: boolean;
  fallbackComponent?: React.ComponentType;
}

// HOC untuk proteksi berdasarkan role
export function withRoleProtection<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: WithRoleProtectionOptions = {}
) {
  const {
    requiredRoles,
    redirectTo,
    showAccessDenied = false, // Default behavior: redirect ke halaman sesuai role
    fallbackComponent: FallbackComponent,
  } = options;

  return function ProtectedComponent(props: P) {
    const { user, role, isLoading } = useUserRole();
    const pathname = usePathname();
    const router = useRouter();
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
      if (isLoading) return;

      setIsChecking(false);

      // Jika tidak ada user, redirect ke login
      if (!user) {
        const loginUrl = `/login?redirect_to=${encodeURIComponent(pathname || '/')}`;
        router.push(loginUrl);
        return;
      }

      // Jika ada requiredRoles, cek apakah user memiliki role yang sesuai
      if (requiredRoles) {
        const allowedRoles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
        const hasAccess = role && allowedRoles.includes(role);

        logRouteAccess(pathname || '', role, !!hasAccess, user.id);

        if (!hasAccess) {
          if (redirectTo) {
            router.push(redirectTo);
          } else if (role) {
            // Redirect ke halaman default sesuai role jika tidak ada redirect khusus
            router.push(getDefaultRedirectUrl(role));
          }
          return;
        }
      }

      // Jika tidak ada requiredRoles, gunakan checkRoutePermission
      if (!requiredRoles) {
        const hasAccess = checkRoutePermission(pathname || '', role);
        
        logRouteAccess(pathname || '', role, hasAccess, user.id);

        if (!hasAccess) {
          if (redirectTo) {
            router.push(redirectTo);
          } else if (role) {
            router.push(getDefaultRedirectUrl(role));
          }
          return;
        }
      }
    }, [isLoading, user, role, pathname, router]);

    // Loading state
    if (isLoading || isChecking) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      );
    }

    // Tidak ada user - akan redirect ke login
    if (!user) {
      return <LoginRequired redirectUrl={pathname || undefined} />;
    }

    // Cek access berdasarkan requiredRoles
    if (requiredRoles) {
      const allowedRoles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
      const hasAccess = role && allowedRoles.includes(role);

      if (!hasAccess) {
        if (FallbackComponent) {
          return <FallbackComponent />;
        }
        
        if (showAccessDenied) {
          return (
            <AccessDenied 
              message={`Halaman ini memerlukan role: ${allowedRoles.join(' atau ')}`}
            />
          );
        }

        return null;
      }
    }

    // Cek access berdasarkan route permission
    if (!requiredRoles) {
      const hasAccess = checkRoutePermission(pathname || '', role);

      if (!hasAccess) {
        if (FallbackComponent) {
          return <FallbackComponent />;
        }
        
        if (showAccessDenied) {
          return <AccessDenied />;
        }

        return null;
      }
    }

    // Render komponen jika semua cek berhasil
    return <WrappedComponent {...props} />;
  };
}

// Hook untuk cek access di dalam komponen
export function useRouteAccess(requiredRoles?: UserRole | UserRole[]) {
  const { role, isLoading } = useUserRole();
  const pathname = usePathname();

  if (isLoading) {
    return {
      hasAccess: false,
      isLoading: true,
      role,
    };
  }

  let hasAccess = false;

  if (requiredRoles) {
    const allowedRoles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    hasAccess = role ? allowedRoles.includes(role) : false;
  } else {
    hasAccess = checkRoutePermission(pathname || '', role);
  }

  return {
    hasAccess,
    isLoading: false,
    role,
  };
}
