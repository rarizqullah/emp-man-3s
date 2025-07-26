'use client';

import { AlertCircle, ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useUserRole } from '@/hooks/useUserRole';
import { getDefaultRedirectUrl } from '@/lib/route-protection';

interface AccessDeniedProps {
  title?: string;
  message?: string;
  showBackButton?: boolean;
  showHomeButton?: boolean;
}

export function AccessDenied({
  title = "Akses Ditolak",
  message = "Anda tidak memiliki izin untuk mengakses halaman ini.",
  showBackButton = true,
  showHomeButton = true,
}: AccessDeniedProps) {
  const router = useRouter();
  const { role } = useUserRole();

  const handleGoHome = () => {
    if (role) {
      router.push(getDefaultRedirectUrl(role));
    } else {
      router.push('/login');
    }
  };

  const handleGoBack = () => {
    router.back();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-xl font-semibold text-gray-900">
            {title}
          </CardTitle>
          <CardDescription className="text-gray-600">
            {message}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {showHomeButton && (
              <Button 
                onClick={handleGoHome}
                className="w-full" 
                variant="default"
              >
                <Home className="mr-2 h-4 w-4" />
                Kembali ke Beranda
              </Button>
            )}
            {showBackButton && (
              <Button 
                onClick={handleGoBack}
                className="w-full" 
                variant="outline"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Kembali ke Halaman Sebelumnya
              </Button>
            )}
          </div>
          
          {role && (
            <div className="mt-6 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Info:</strong> Anda login sebagai <span className="font-medium">{role}</span>. 
                Jika Anda merasa ini adalah kesalahan, silakan hubungi administrator.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Komponen khusus untuk halaman yang memerlukan login
export function LoginRequired({
  redirectUrl,
}: {
  redirectUrl?: string;
}) {
  const router = useRouter();

  const handleLogin = () => {
    const loginUrl = redirectUrl 
      ? `/login?redirect_to=${encodeURIComponent(redirectUrl)}`
      : '/login';
    router.push(loginUrl);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <AlertCircle className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="text-xl font-semibold text-gray-900">
            Login Diperlukan
          </CardTitle>
          <CardDescription className="text-gray-600">
            Anda perlu login untuk mengakses halaman ini.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleLogin}
            className="w-full"
          >
            Login Sekarang
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
