'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabase/client';

type SupabaseContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
};

const SupabaseContext = createContext<SupabaseContextType | undefined>(
  undefined
);

export default function SupabaseProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

  useEffect(() => {
    const setData = async () => {
      const {
        data: { session },
      } = await supabaseClient.auth.getSession();
      
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    };

    // Jalankan setData untuk mendapatkan session pertama kali
    setData();

    // Setup listener untuk perubahan auth state
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);

        // Jika user baru sign up atau sign in, buat atau update user di database
        if (session && (event === 'SIGNED_IN' || event === 'USER_UPDATED')) {
          try {
            await fetch('/api/users', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                authId: session.user.id,
                email: session.user.email,
                name: session.user.user_metadata.name || session.user.email,
              }),
            });
          } catch (error) {
            console.error('Error syncing user data:', error);
          }
        }

        // Refresh data
        router.refresh();
      }
    );

    // Cleanup listener
    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  const signOut = async () => {
    await supabaseClient.auth.signOut();
    router.push('/login');
  };

  const value = {
    user,
    session,
    isLoading,
    signOut,
  };

  return (
    <SupabaseContext.Provider value={value}>
      {children}
    </SupabaseContext.Provider>
  );
}

export const useSupabase = () => {
  const context = useContext(SupabaseContext);
  if (context === undefined) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
}; 