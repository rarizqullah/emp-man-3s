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

// Enhanced cache management dengan session storage untuk persistence
const CACHE_KEY = 'user-role-cache-v2';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes - lebih lama

// Utility functions untuk cache management yang lebih robust
function getCachedUserData(): CachedUserData | null {
  try {
    // Try both sessionStorage dan localStorage untuk redundancy
    const cached = sessionStorage.getItem(CACHE_KEY) || localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const data: CachedUserData = JSON.parse(cached);
    
    // Check expiration
    if (Date.now() > data.expiresAt) {
      clearCachedUserData();
      return null;
    }
    
    return data;
  } catch (error) {
    console.warn('Error reading cache:', error);
    clearCachedUserData();
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
    
    const cacheString = JSON.stringify(cached);
    
    // Store in both for redundancy
    sessionStorage.setItem(CACHE_KEY, cacheString);
    localStorage.setItem(CACHE_KEY, cacheString);
    
    console.log('✅ User role cached successfully:', {
      email: userData.email,
      role: userData.role,
      expiresAt: new Date(cached.expiresAt).toLocaleString()
    });
  } catch (error) {
    console.warn('Error setting cache:', error);
  }
}

function clearCachedUserData(): void {
  try {
    sessionStorage.removeItem(CACHE_KEY);
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
  const lastFetchRef = useRef<number>(0);

  // Fallback user data dengan prioritas role dari cache/session
  const getFallbackUserData = useCallback((): UserWithRole | null => {
    if (!user) return null;
    
    // Try to get role from cached data first
    const cached = getCachedUserData();
    if (cached && cached.id === user.id) {
      return cached;
    }
    
    return {
      id: user.id,
      name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
      email: user.email || '',
      role: 'EMPLOYEE', // Safe default
      employeeId: undefined
    };
  }, [user]);

  // Simplified API fetch - NO AbortController, NO complex timeout untuk menghindari AbortError
  const fetchFromAPI = useCallback(async (): Promise<UserWithRole | null> => {
    const requestId = Date.now();
    lastFetchRef.current = requestId;
    
    try {
      console.log('🔄 Fetching user role from API...', { 
        userId: user?.id,
        email: user?.email,
        requestId
      });
      
      // Simple fetch with better error handling and timeout
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout after 8 seconds')), 8000)
      );
      
      const fetchPromise = fetch('/api/users/me', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'X-Request-ID': requestId.toString(),
        },
        credentials: 'include' // Important for session cookies
      });
      
      const apiResponse = await Promise.race([fetchPromise, timeoutPromise]);

      // Check if this is still the latest request
      if (requestId !== lastFetchRef.current) {
        console.log('🔄 Request obsolete, ignoring result');
        return null;
      }

      if (!apiResponse.ok) {
        // Handle specific HTTP status codes
        if (apiResponse.status === 401) {
          console.warn('⚠️ Authentication failed - user may need to re-login');
          // Clear cache on auth failure
          clearCachedUserData();
          return null;
        }
        
        if (apiResponse.status === 403) {
          console.warn('⚠️ Access forbidden - insufficient permissions');
          return null;
        }
        
        throw new Error(`HTTP ${apiResponse.status}: ${apiResponse.statusText}`);
      }

      const result = await apiResponse.json();
      const userData = result.success ? result.data : result;

      if (!userData || !userData.id) {
        throw new Error('Invalid user data from server');
      }

      // Strong role validation dengan database priority
      const validRoles: UserRole[] = ['ADMIN', 'MANAGER', 'EMPLOYEE'];
      let userRole: UserRole = 'EMPLOYEE'; // Default fallback
      
      // Prioritas tinggi untuk role dari database
      if (userData.role && validRoles.includes(userData.role)) {
        userRole = userData.role;
        console.log('✅ Role from database:', userData.role);
      } else {
        console.warn('⚠️ Invalid or missing role from API, using EMPLOYEE:', userData.role);
      }

      const userWithRoleData: UserWithRole = {
        id: userData.id,
        name: userData.name || user?.email?.split('@')[0] || 'User',
        email: userData.email || user?.email || '',
        role: userRole,
        employeeId: userData.employee?.id,
      };

      // Cache successful response
      setCachedUserData(userWithRoleData);
      
      console.log('✅ User role fetched successfully:', {
        id: userWithRoleData.id,
        email: userWithRoleData.email,
        role: userWithRoleData.role,
        source: 'DATABASE',
        requestId
      });
      
      return userWithRoleData;

    } catch (fetchError) {
      // Only process if this is still the latest request
      if (requestId !== lastFetchRef.current) {
        return null;
      }
      
      const errorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown error';
      
      // Handle different error types but don't throw - let main function handle fallback
      if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
        console.error('❌ Server response timeout');
        return null;
      }
      
      if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
        console.error('❌ Network error');
        return null;
      }
      
      console.error('❌ API fetch failed:', errorMessage);
      return null;
    }
  }, [user]);

  // Main fetch function dengan simplified strategy dan no abort issues
  const fetchUserRole = useCallback(async () => {
    if (!user || !session) {
      console.log('🔄 No user/session, clearing role data');
      setUserWithRole(null);
      setIsLoading(false);
      setIsUsingCache(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Check cache first dengan priority tinggi
      const cachedData = getCachedUserData();
      if (cachedData && cachedData.id === user.id) {
        console.log('✅ Using cached role data:', {
          email: cachedData.email,
          role: cachedData.role,
          cacheAge: Math.round((Date.now() - cachedData.cachedAt) / 1000) + 's'
        });
        
        setUserWithRole(cachedData);
        setIsUsingCache(true);
        setIsLoading(false);
        
        // Background refresh if cache is older than 2 minutes untuk keep fresh
        const cacheAge = Date.now() - cachedData.cachedAt;
        if (cacheAge > 2 * 60 * 1000) {
          console.log('🔄 Cache aging, refreshing in background...');
          fetchFromAPI().then(apiData => {
            if (apiData && apiData.role !== cachedData.role) {
              console.log('🔄 Role changed, updating:', { 
                old: cachedData.role, 
                new: apiData.role 
              });
              setUserWithRole(apiData);
              setIsUsingCache(false);
            }
          }).catch(() => {
            // Silent fail for background refresh - no error logging
          });
        }
        
        return;
      }

      // Step 2: Try API fetch
      const apiData = await fetchFromAPI();
      
      if (apiData) {
        setUserWithRole(apiData);
        setIsUsingCache(false);
        setIsLoading(false);
        return;
      }

      // Step 3: Use fallback data if API failed
      const fallbackData = getFallbackUserData();
      if (fallbackData) {
        console.log('⚠️ Using fallback role data (EMPLOYEE default):', {
          email: fallbackData.email,
          role: fallbackData.role
        });
        setUserWithRole(fallbackData);
        setIsUsingCache(false);
        setError('Using default role - database temporarily unavailable');
      } else {
        // If even fallback fails, set error state
        setError('Authentication required - please refresh the page');
      }

    } catch (err) {
      // Simplified error handling - always provide fallback
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.warn('⚠️ Role fetch error:', errorMessage);
      
      // Don't throw errors - always try to provide fallback data
      const fallbackData = getFallbackUserData();
      if (fallbackData) {
        console.log('🔧 Error fallback - using safe defaults:', {
          email: fallbackData.email,
          role: fallbackData.role,
          error: errorMessage
        });
        setUserWithRole(fallbackData);
        setIsUsingCache(false);
        setError(`Service temporarily unavailable: ${errorMessage}`);
      } else {
        setError(`Cannot authenticate user: ${errorMessage}`);
      }
      const emergencyData = getFallbackUserData();
      if (emergencyData) {
        setUserWithRole(emergencyData);
        setError('Using default role - please refresh to retry');
      }
    } finally {
      setIsLoading(false);
    }
  }, [user, session, fetchFromAPI, getFallbackUserData]);

  // Initial fetch effect
  useEffect(() => {
    fetchUserRole();
  }, [fetchUserRole]);

  // Reset on user change
  useEffect(() => {
    if (!user) {
      setUserWithRole(null);
      setError(null);
      setIsLoading(false);
      setIsUsingCache(false);
      clearCachedUserData();
    }
  }, [user]);

  // Manual refresh function
  const refreshUserRole = useCallback(async () => {
    console.log('🔄 Manual role refresh requested');
    clearCachedUserData();
    await fetchUserRole();
  }, [fetchUserRole]);

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
