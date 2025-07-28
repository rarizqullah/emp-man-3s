'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSupabase } from '@/providers/supabase-provider';

export type UserRole = 'ADMIN' | 'MANAGER' | 'EMPLOYEE';

export interface UserWithRole {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  employeeId?: string;
}

interface CachedUserData extends UserWithRole {
  cachedAt: number;
  expiresAt: number;
}

// Simplified cache management
const CACHE_KEY = 'user-role-cache';
const CACHE_DURATION = 3 * 60 * 1000; // 3 minutes

function getCachedUserData(): CachedUserData | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const data: CachedUserData = JSON.parse(cached);
    
    if (Date.now() > data.expiresAt) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    
    return data;
  } catch {
    localStorage.removeItem(CACHE_KEY);
    return null;
  }
}

function setCachedUserData(userData: UserWithRole): void {
  try {
    const cached: CachedUserData = {
      ...userData,
      cachedAt: Date.now(),
      expiresAt: Date.now() + CACHE_DURATION
    };
    
    localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
  } catch (error) {
    console.warn('Error setting cache:', error);
  }
}

function clearCachedUserData(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (error) {
    console.warn('Error clearing cache:', error);
  }
}

export function useUserRole() {
  const { user, session, isLoading: authLoading } = useSupabase();
  const [userWithRole, setUserWithRole] = useState<UserWithRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUsingCache, setIsUsingCache] = useState(false);
  const fetchAttemptRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup function untuk abort controllers
  const cleanupRequest = useCallback(() => {
    if (abortControllerRef.current && !abortControllerRef.current.signal.aborted) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // Fallback user data dari Supabase session dengan role EMPLOYEE yang aman
  const getFallbackUserData = useCallback((): UserWithRole | null => {
    if (!user) return null;
    
    return {
      id: user.id,
      name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
      email: user.email || '',
      role: 'EMPLOYEE', // Safe default role
      employeeId: undefined
    };
  }, [user]);

  // Single API call dengan simplified timeout handling
  const fetchFromAPI = useCallback(async (): Promise<UserWithRole | null> => {
    // Cleanup any existing request
    cleanupRequest();
    
    // Create new abort controller
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      console.log('🔄 Fetching user role from database API...');
      
      // Timeout dengan Promise.race untuk menghindari AbortError
      const fetchPromise = fetch('/api/users/me', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal,
      });

      const timeoutPromise = new Promise<never>((_, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Request timeout after 8 seconds'));
        }, 8000); // 8 detik timeout
        
        // Cleanup timeout jika request selesai
        signal.addEventListener('abort', () => {
          clearTimeout(timeoutId);
        });
      });

      const response = await Promise.race([fetchPromise, timeoutPromise]);

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      const userData = result.success ? result.data : result;

      if (!userData || !userData.id) {
        throw new Error('Invalid user data received from server');
      }

      // Strong role validation
      const validRoles: UserRole[] = ['ADMIN', 'MANAGER', 'EMPLOYEE'];
      const userRole: UserRole = validRoles.includes(userData.role) ? userData.role : 'EMPLOYEE';

      const userWithRoleData: UserWithRole = {
        id: userData.id,
        name: userData.name || user?.email?.split('@')[0] || 'User',
        email: userData.email || user?.email || '',
        role: userRole,
        employeeId: userData.employee?.id,
      };

      // Cache successful response
      setCachedUserData(userWithRoleData);
      
      console.log('✅ User role fetched from database:', {
        id: userWithRoleData.id,
        email: userWithRoleData.email,
        role: userWithRoleData.role,
        fromDatabase: true
      });
      
      return userWithRoleData;

    } catch (fetchError) {
      // Handle different error types
      const errorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown error';
      
      if (signal.aborted) {
        throw new Error('Request was cancelled');
      }
      
      if (errorMessage.includes('timeout')) {
        throw new Error('Request timeout - server took too long to respond');
      }
      
      if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
        throw new Error('Network error - please check your connection');
      }
      
      throw new Error(`API error: ${errorMessage}`);
    } finally {
      // Cleanup
      abortControllerRef.current = null;
    }
  }, [user, cleanupRequest]);

  // Main fetch function dengan simplified strategy
  const fetchUserRole = useCallback(async () => {
    if (!user || !session) {
      setUserWithRole(null);
      setIsLoading(false);
      setIsUsingCache(false);
      return;
    }

    fetchAttemptRef.current++;
    const attemptId = fetchAttemptRef.current;

    try {
      setIsLoading(true);
      setError(null);

      // Step 1: Try cache first
      const cachedData = getCachedUserData();
      if (cachedData && cachedData.id === user.id) {
        console.log('✅ Using cached user role:', cachedData);
        setUserWithRole(cachedData);
        setIsUsingCache(true);
        setIsLoading(false);
        return;
      }

      // Step 2: Try API
      try {
        const apiData = await fetchFromAPI();
        
        // Check if this is still the latest attempt
        if (attemptId === fetchAttemptRef.current && apiData) {
          setUserWithRole(apiData);
          setIsUsingCache(false);
          setIsLoading(false);
          return;
        }
      } catch (apiError) {
        console.warn('API failed:', apiError);
        
        // Set specific error message
        const errorMessage = apiError instanceof Error ? apiError.message : 'Unknown error';
        setError(errorMessage);
      }

      // Step 3: Use fallback data
      const fallbackData = getFallbackUserData();
      if (fallbackData && attemptId === fetchAttemptRef.current) {
        console.log('⚠️ Using fallback user data (EMPLOYEE role):', fallbackData);
        setUserWithRole(fallbackData);
        setIsUsingCache(false);
        
        if (!error) {
          setError('Using offline mode - role set to EMPLOYEE');
        }
      }

    } catch (err) {
      if (attemptId === fetchAttemptRef.current) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('❌ All user role fetch strategies failed:', errorMessage);
        setError(errorMessage);
        
        // Last resort fallback
        const lastResortData = getFallbackUserData();
        if (lastResortData) {
          setUserWithRole(lastResortData);
        }
      }
    } finally {
      if (attemptId === fetchAttemptRef.current) {
        setIsLoading(false);
      }
    }
  }, [user, session, fetchFromAPI, getFallbackUserData, error]);

  // Effect untuk fetch user role
  useEffect(() => {
    fetchUserRole();
  }, [fetchUserRole]);

  // Reset state ketika user logout
  useEffect(() => {
    if (!user) {
      cleanupRequest(); // Cleanup any pending requests
      setUserWithRole(null);
      setError(null);
      setIsLoading(false);
      setIsUsingCache(false);
      clearCachedUserData();
    }
  }, [user, cleanupRequest]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupRequest();
    };
  }, [cleanupRequest]);

  // Manual refresh function
  const refreshUserRole = useCallback(async () => {
    clearCachedUserData();
    cleanupRequest();
    await fetchUserRole();
  }, [fetchUserRole, cleanupRequest]);

  // Role checking functions
  const hasRole = useCallback((roles: UserRole | UserRole[]): boolean => {
    if (!userWithRole) return false;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    return allowedRoles.includes(userWithRole.role);
  }, [userWithRole]);

  const isAdmin = useCallback((): boolean => hasRole('ADMIN'), [hasRole]);
  const isManager = useCallback((): boolean => hasRole('MANAGER'), [hasRole]);
  const isEmployee = useCallback((): boolean => hasRole('EMPLOYEE'), [hasRole]);
  const canManageEmployees = useCallback((): boolean => hasRole(['ADMIN', 'MANAGER']), [hasRole]);

  return {
    user: userWithRole,
    role: userWithRole?.role || null,
    isLoading: authLoading || isLoading,
    error,
    isUsingCache,
    hasRole,
    isAdmin,
    isManager,
    isEmployee,
    canManageEmployees,
    refreshUserRole,
  };
}
