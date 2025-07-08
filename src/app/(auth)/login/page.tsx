'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { LoginForm } from '@/components/login-form';
import { supabaseClient } from '@/lib/supabase/client';
import { toast } from '@/components/ui/use-toast';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);
  const checkAuth = searchParams?.get('check_auth');
  const redirectTo = searchParams?.get('redirect_to') || '/dashboard';

  useEffect(() => {
    // Jika ada parameter check_auth, cek apakah user sudah login
    if (checkAuth === 'true') {
      setIsCheckingAuth(true);
      checkExistingAuth();
    }
  }, [checkAuth]);

  const checkExistingAuth = async () => {
    try {
      console.log('🔍 Checking for existing authentication...');
      
      // Check apakah user sudah login dengan getUser() yang secure
      const { data: { user }, error } = await supabaseClient.auth.getUser();
      
      if (user && !error) {
        console.log('✅ Found existing authentication for:', user.email);
        
        toast({
          title: 'Sudah Login',
          description: 'Anda sudah login, mengarahkan ke dashboard...',
        });
        
        // Redirect ke halaman yang dituju
        setTimeout(() => {
          window.location.href = redirectTo;
        }, 1000);
        
        return;
      } else {
        console.log('⚠️ No existing authentication found');
        if (error) {
          console.log('Auth error:', error.message);
        }
        
        toast({
          title: 'Sesi Berakhir',
          description: 'Sesi Anda telah berakhir, silakan login kembali',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('❌ Error checking existing auth:', error);
      toast({
        title: 'Error',
        description: 'Terjadi kesalahan saat memeriksa autentikasi',
        variant: 'destructive',
      });
    } finally {
      setIsCheckingAuth(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memeriksa autentikasi...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <LoginForm />
      </div>
    </div>
  );
} 