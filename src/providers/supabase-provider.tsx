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

// Timeout untuk auth operations
const AUTH_TIMEOUT = 5000;

// Helper function untuk timeout
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error('Auth operation timeout')), timeoutMs)
    )
  ]);
}

// Helper function untuk sync user - simplified dan robust
const syncUserSafely = async (session: Session): Promise<boolean> => {
  try {
    const userData = {
      authId: session.user.id,
      email: session.user.email,
      name: session.user.user_metadata.name || session.user.email,
    };

    const response = await fetch('/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    return response.ok;
  } catch (error) {
    console.error('❌ User sync error:', error);
    return false;
  }
};

export default function SupabaseProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [syncAttempted, setSyncAttempted] = useState<boolean>(false);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    const getInitialSession = async () => {
      try {
        // Use getUser() yang lebih secure
        const result = await withTimeout(
          supabaseClient.auth.getUser(),
          AUTH_TIMEOUT
        );

        if (!isMounted) return;

        const { data: { user: userData }, error } = result;
        
        if (error || !userData) {
          setSession(null);
          setUser(null);
          setIsLoading(false);
          return;
        }

        // Get session after user validation
        // Note: This getSession() is safe because we already validated user with getUser()
        const { data: { session: sessionData } } = await supabaseClient.auth.getSession();
        
        if (sessionData && sessionData.user) {
          setSession(sessionData);
          setUser(sessionData.user);
          
          // Background sync tanpa blocking UI
          if (!syncAttempted) {
            setSyncAttempted(true);
            syncUserSafely(sessionData).catch(() => {
              // Ignore sync errors - tidak critical
            });
          }
        } else {
          setSession(null);
          setUser(null);
        }
      } catch (error) {
        console.error('❌ Initial session error:', error);
        if (isMounted) {
          setSession(null);
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    // Jalankan initial check
    getInitialSession();

    // Setup listener untuk perubahan auth state
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        if (event === 'SIGNED_IN' && session) {
          setSession(session);
          setUser(session.user);
          setIsLoading(false);
          
          // Background sync
          if (!syncAttempted) {
            setSyncAttempted(true);
            syncUserSafely(session).catch(() => {
              // Ignore sync errors
            });
          }
        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setSyncAttempted(false);
          setIsLoading(false);
        } else if (event === 'TOKEN_REFRESHED' && session) {
          setSession(session);
          setUser(session.user);
          setIsLoading(false);
        }
        
        // Minimal router refresh hanya saat perlu
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          router.refresh();
        }
      }
    );

    // Cleanup function
    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [router, syncAttempted]);

  const signOut = async () => {
    try {
      setSyncAttempted(false);
      
      // Use our custom logout API that includes activity logging
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      
      if (!response.ok) {
        console.warn('⚠️ Logout API warning:', result.message);
      } else {
        console.log('✅ Logout successful via API');
      }
      
      // Clear localStorage regardless of API result
      localStorage.removeItem('auth_backup');
      
      // Also perform client-side signout as fallback
      await withTimeout(
        supabaseClient.auth.signOut(),
        AUTH_TIMEOUT
      );
      
      // Redirect to login
      router.push('/login');
    } catch (error) {
      console.error('❌ Sign out error:', error);
      
      // Clear localStorage and force redirect even if logout fails
      localStorage.removeItem('auth_backup');
      router.push('/login');
    }
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