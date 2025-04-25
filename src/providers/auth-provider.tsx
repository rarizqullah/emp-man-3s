'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthService, UserData } from '@/lib/auth-service';

type AuthContextType = {
  user: UserData | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{
    success: boolean;
    message?: string;
  }>;
  register: (email: string, password: string, fullName?: string) => Promise<{
    success: boolean;
    message?: string;
  }>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Fungsi untuk mengecek apakah user sudah login (ada token di localStorage)
  const checkAuth = async () => {
    try {
      setIsLoading(true);
      
      // Di client-side, cek token dari localStorage
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      
      if (!token) {
        setUser(null);
        setIsLoading(false);
        return;
      }
      
      // Jika token ada, ambil userId dari token (menggunakan parsing JWT di client-side)
      // Catatan: ini pendekatan sederhana, idealnya ambil data dari endpoint API
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(window.atob(base64));
      
      // Validasi apakah token sudah expired
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        // Token sudah expired, hapus dari localStorage
        localStorage.removeItem('token');
        setUser(null);
        setIsLoading(false);
        return;
      }
      
      // Ambil data user
      if (payload.userId) {
        // Simpan info user dasar dari token
        setUser({
          id: payload.userId,
          email: payload.email,
          role: payload.role,
          created_at: '',
        });
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  // Fungsi untuk login
  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      
      const result = await AuthService.loginUser(email, password);
      
      if (result.success && result.token && result.user) {
        // Simpan token di localStorage
        localStorage.setItem('token', result.token);
        
        // Set user state
        setUser(result.user);
        
        // Refresh halaman
        router.refresh();
        
        return { success: true };
      }
      
      return { 
        success: false, 
        message: result.message || 'Login gagal'
      };
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        message: 'Terjadi kesalahan saat login'
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Fungsi untuk registrasi
  const register = async (email: string, password: string, fullName?: string) => {
    try {
      setIsLoading(true);
      
      const result = await AuthService.registerUser({
        email,
        password,
        fullName,
      });
      
      if (result.success) {
        return { success: true, message: result.message };
      }
      
      return { 
        success: false, 
        message: result.message || 'Registrasi gagal'
      };
    } catch (error) {
      console.error('Register error:', error);
      return { 
        success: false, 
        message: 'Terjadi kesalahan saat registrasi'
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Fungsi untuk logout
  const logout = () => {
    // Hapus token dari localStorage
    localStorage.removeItem('token');
    
    // Reset state
    setUser(null);
    
    // Redirect ke halaman login
    router.push('/login');
  };

  const value = {
    user,
    isLoading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}; 