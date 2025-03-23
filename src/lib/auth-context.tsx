'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSupabase } from './supabase-provider';

type AuthContextType = {
  isLoading: boolean;
  isAuthenticated: boolean;
  userInfo: {
    id?: string;
    email?: string;
    name?: string;
    role?: string;
  } | null;
};

const AuthContext = createContext<AuthContextType>({
  isLoading: true,
  isAuthenticated: false,
  userInfo: null
});

export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, loading } = useSupabase();
  const [userInfo, setUserInfo] = useState<AuthContextType['userInfo']>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Efek untuk menangani navigasi otomatis berdasarkan auth state
  useEffect(() => {
    if (loading) return; // Tunggu sampai loading selesai

    // Definisi path publik
    const isPublicPath = pathname.startsWith('/login') || 
                         pathname.startsWith('/register') || 
                         pathname.startsWith('/forgot-password') || 
                         pathname.startsWith('/reset-password') ||
                         pathname.startsWith('/auth/');
    
    if (user && isPublicPath) {
      // Jika sudah login dan di halaman publik, arahkan ke dashboard
      console.log('[AuthContext] User terautentikasi di halaman publik, redirect ke dashboard');
      router.push('/dashboard');
    } else if (!user && !isPublicPath) {
      // Jika belum login dan di halaman yang butuh auth, arahkan ke login
      console.log('[AuthContext] User tidak terautentikasi di halaman terproteksi, redirect ke login');
      router.push('/login');
    }
  }, [user, pathname, loading, router]);

  // Effect untuk menyinkronkan user data saat user berubah
  useEffect(() => {
    if (!user) {
      setUserInfo(null);
      return;
    }

    // Extract user info
    setUserInfo({
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
      role: user.user_metadata?.role || 'EMPLOYEE'
    });

    // Sinkronkan user ke backend jika perlu
    const syncUser = async () => {
      try {
        console.log('[AuthContext] Sinkronisasi user ke backend');
        const response = await fetch('/api/auth/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });
        
        if (!response.ok) {
          console.warn('[AuthContext] Gagal sinkronisasi user:', await response.text());
        } else {
          console.log('[AuthContext] User berhasil disinkronkan');
        }
      } catch (error) {
        console.error('[AuthContext] Error sinkronisasi:', error);
      }
    };

    syncUser();
  }, [user]);

  return (
    <AuthContext.Provider 
      value={{ 
        isLoading: loading, 
        isAuthenticated: !!user, 
        userInfo 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
} 