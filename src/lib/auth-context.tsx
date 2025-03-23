'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { useSupabase } from './supabase-provider';

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  error: null,
});

export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [error] = useState<Error | null>(null);
  const { session } = useSupabase();
  
  // Fungsi untuk sinkronisasi user dengan database lokal
  const syncUserWithDatabase = async (userId: string) => {
    try {
      const response = await fetch('/api/auth/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });
      
      if (!response.ok) {
        console.error('[AuthContext] Error sinkronisasi user:', await response.text());
        return;
      }
      
      console.log('[AuthContext] User disinkronkan dengan database');
    } catch (err) {
      console.error('[AuthContext] Error sinkronisasi user:', err);
    }
  };

  // Sinkronkan user dengan database lokal saat sesi berubah
  useEffect(() => {
    if (session?.user?.id) {
      syncUserWithDatabase(session.user.id);
    }
  }, [session]);

  const isLoading = session === undefined;
  const user = session?.user || null;

  return (
    <AuthContext.Provider value={{ user, isLoading, error }}>
      {children}
    </AuthContext.Provider>
  );
} 