'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase/client';

type SupabaseContextType = {
  supabase: typeof supabase;
  session: Session | null;
  user: User | null;
  loading: boolean;
};

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

export const SupabaseProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getInitialSession() {
      try {
        console.log('[SupabaseProvider] Mengambil sesi awal');
        
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        setSession(initialSession);
        setUser(initialSession?.user || null);
        
        // Log status sesi
        if (initialSession) {
          console.log('[SupabaseProvider] Sesi awal ditemukan untuk user:', initialSession.user.email);
        } else {
          console.log('[SupabaseProvider] Tidak ada sesi awal');
        }
      } catch (error) {
        console.error('[SupabaseProvider] Error mengambil sesi awal:', error);
      } finally {
        setLoading(false);
      }
    }

    // Panggil fungsi untuk mendapatkan sesi saat komponen dimuat
    getInitialSession();

    // Set up listener untuk perubahan auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.log('[SupabaseProvider] Auth state berubah:', event);
      setSession(newSession);
      setUser(newSession?.user || null);
      
      // Detail perubahan untuk debugging
      if (event === 'SIGNED_IN') {
        console.log('[SupabaseProvider] User signed in:', newSession?.user.email);
      } else if (event === 'SIGNED_OUT') {
        console.log('[SupabaseProvider] User signed out');
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('[SupabaseProvider] Token diperbarui untuk user:', newSession?.user.email);
      }
    });

    // Cleanup subscription
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    supabase,
    session,
    user,
    loading,
  };

  return (
    <SupabaseContext.Provider value={value}>
      {!loading && children}
    </SupabaseContext.Provider>
  );
};

export const useSupabase = () => {
  const context = useContext(SupabaseContext);
  if (context === undefined) {
    throw new Error('useSupabase harus digunakan di dalam SupabaseProvider');
  }
  return context;
}; 