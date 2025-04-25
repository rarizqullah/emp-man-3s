'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { AuthService } from './auth-service';

export interface User {
  id: string;
  email: string;
  user_metadata?: {
    name?: string;
    full_name?: string;
    avatar_url?: string;
    role?: string;
  };
  created_at?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{
    success: boolean;
    message?: string;
    user?: User;
  }>;
  signOut: () => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<{
    success: boolean;
    message?: string;
    user?: User;
  }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Fungsi untuk memeriksa autentikasi saat load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setLoading(true);
        
        // Periksa token dari localStorage
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        
        if (!token) {
          setUser(null);
          return;
        }
        
        // Parse token JWT
        try {
          const base64Url = token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const payload = JSON.parse(window.atob(base64));
          
          // Cek apakah token sudah expired
          if (payload.exp && payload.exp * 1000 < Date.now()) {
            // Token expired
            localStorage.removeItem('token');
            setUser(null);
            return;
          }
          
          // Ambil data user dari server jika tersedia
          if (payload.userId) {
            try {
              const response = await fetch('/api/auth/me');
              
              if (response.ok) {
                const data = await response.json();
                
                if (data.success && data.user) {
                  // Format user data untuk kompatibilitas dengan interface
                  setUser({
                    id: data.user.id,
                    email: data.user.email,
                    user_metadata: {
                      name: data.user.full_name,
                      full_name: data.user.full_name,
                      role: data.user.role || 'user',
                    },
                    created_at: data.user.created_at,
                  });
                  return;
                }
              }
            } catch (error) {
              console.error('Error fetching user data:', error);
            }
            
            // Fallback ke data dari token jika tidak bisa mengambil dari API
            setUser({
              id: payload.userId,
              email: payload.email,
              user_metadata: {
                role: payload.role || 'user',
              },
            });
          }
        } catch (error) {
          console.error('Error parsing token:', error);
          localStorage.removeItem('token');
          setUser(null);
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Login function
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      const result = await AuthService.loginUser(email, password);
      
      if (result.success && result.token) {
        localStorage.setItem('token', result.token);
        
        // Set user data
        if (result.user) {
          const userData: User = {
            id: result.user.id,
            email: result.user.email,
            user_metadata: {
              name: result.user.full_name,
              full_name: result.user.full_name,
              role: result.user.role || 'user',
            },
            created_at: result.user.created_at,
          };
          
          setUser(userData);
          
          return { 
            success: true,
            user: userData,
          };
        }
      }
      
      return { 
        success: false, 
        message: result.message || 'Login gagal'
      };
    } catch (error) {
      console.error('Error signing in:', error);
      return { 
        success: false, 
        message: 'Terjadi kesalahan saat login'
      };
    } finally {
      setLoading(false);
    }
  };

  // Sign up function
  const signUp = async (name: string, email: string, password: string) => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: name,
          email,
          password,
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        if (result.user) {
          // Setelah registrasi berhasil, lakukan redirect ke login
          // (kita tidak mengeset user state agar user melakukan login)
          return { 
            success: true,
            message: 'Registrasi berhasil. Silakan login dengan akun baru Anda.',
          };
        }
      }
      
      return { 
        success: false, 
        message: result.message || 'Registrasi gagal'
      };
    } catch (error) {
      console.error('Error signing up:', error);
      return { 
        success: false, 
        message: 'Terjadi kesalahan saat registrasi'
      };
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const signOut = async () => {
    try {
      // Remove token
      localStorage.removeItem('token');
      
      // Clear user state
      setUser(null);
      
      // Call logout API
      await fetch('/api/auth/logout', {
        method: 'POST',
      });
      
      // Redirect to login page
      window.location.href = '/login';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const value = {
    user,
    loading,
    signIn,
    signOut,
    signUp,
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