import { useCallback } from 'react';
import { useSupabase } from '@/providers/supabase-provider';

interface ActivityMetadata {
  [key: string]: string | number | boolean | Date | undefined;
}

export const useAuthActivityLogger = () => {
  const { user } = useSupabase();

  const logActivity = useCallback(async (
    action: 'PAGE_ACCESS' | 'SESSION_REFRESH' | 'AUTH_CHECK',
    metadata?: ActivityMetadata
  ) => {
    if (!user) {
      console.warn('Cannot log activity: user not authenticated');
      return;
    }

    try {
      const response = await fetch('/api/auth/activity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          metadata: {
            ...metadata,
            timestamp: new Date().toISOString(),
            pathname: window.location.pathname,
            origin: window.location.origin
          }
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        console.warn('Failed to log activity:', result.message);
        return;
      }

      console.log(`📋 Activity logged: ${action}`);
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  }, [user]);

  const logPageAccess = useCallback((pageName: string, metadata?: ActivityMetadata) => {
    return logActivity('PAGE_ACCESS', {
      page: pageName,
      ...metadata
    });
  }, [logActivity]);

  const logSessionRefresh = useCallback((metadata?: ActivityMetadata) => {
    return logActivity('SESSION_REFRESH', metadata);
  }, [logActivity]);

  const logAuthCheck = useCallback((metadata?: ActivityMetadata) => {
    return logActivity('AUTH_CHECK', metadata);
  }, [logActivity]);

  return {
    logActivity,
    logPageAccess,
    logSessionRefresh,
    logAuthCheck,
    isAuthenticated: !!user
  };
};
