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

// Circuit Breaker untuk mengelola API failures
class ApiCircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  private readonly failureThreshold = 3;
  private readonly recoveryTimeout = 30000; // 30 seconds
  private readonly requestTimeout = 5000; // 5 seconds - lebih pendek dari sebelumnya

  canExecute(): boolean {
    const now = Date.now();
    
    if (this.state === 'CLOSED') {
      return true;
    }
    
    if (this.state === 'OPEN') {
      if (now - this.lastFailureTime >= this.recoveryTimeout) {
        this.state = 'HALF_OPEN';
        return true;
      }
      return false;
    }
    
    // HALF_OPEN - allow one request
    return true;
  }

  onSuccess(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  getTimeout(): number {
    return this.requestTimeout;
  }

  getStatus() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      canExecute: this.canExecute()
    };
  }
}

const circuitBreaker = new ApiCircuitBreaker();

// Cache management
const CACHE_KEY = 'user-role-cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

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
  } catch (error) {
    console.warn('Error reading cache:', error);
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

  // Fallback user data dari Supabase session
  const getFallbackUserData = useCallback((): UserWithRole | null => {
    if (!user) return null;
    
    return {
      id: user.id,
      name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
      email: user.email || '',
      role: 'EMPLOYEE', // Safe default
      employeeId: undefined
    };
  }, [user]);

  // API call dengan circuit breaker
  const fetchFromAPI = useCallback(async (): Promise<UserWithRole | null> => {
    if (!circuitBreaker.canExecute()) {
      console.warn('🚫 Circuit breaker OPEN - skipping API call');
      throw new Error('API circuit breaker is open');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), circuitBreaker.getTimeout());

    try {
      console.log('🔄 Fetching user role from fast API...');
      
      // Try fast endpoint first
      const response = await fetch('/api/users/me-fast', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // If fast endpoint fails, try original endpoint with shorter timeout
        console.log('⚠️ Fast endpoint failed, trying original endpoint...');
        
        const fallbackController = new AbortController();
        const fallbackTimeoutId = setTimeout(() => fallbackController.abort(), 3000); // 3 seconds only
        
        try {
          const fallbackResponse = await fetch('/api/users/me', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            signal: fallbackController.signal,
          });
          
          clearTimeout(fallbackTimeoutId);
          
          if (!fallbackResponse.ok) {
            throw new Error(`Both endpoints failed: ${response.status}, ${fallbackResponse.status}`);
          }
          
          const fallbackResult = await fallbackResponse.json();
          const fallbackData = fallbackResult.success ? fallbackResult.data : fallbackResult;
          
          if (!fallbackData || !fallbackData.id) {
            throw new Error('Invalid user data from fallback endpoint');
          }
          
          // Process fallback data
          const validRoles: UserRole[] = ['ADMIN', 'MANAGER', 'EMPLOYEE'];
          const userRole: UserRole = validRoles.includes(fallbackData.role) ? fallbackData.role : 'EMPLOYEE';

          const userWithRoleData: UserWithRole = {
            id: fallbackData.id,
            name: fallbackData.name || user?.email?.split('@')[0] || 'User',
            email: fallbackData.email || user?.email || '',
            role: userRole,
            employeeId: fallbackData.employee?.id,
          };

          circuitBreaker.onSuccess();
          setCachedUserData(userWithRoleData);
          
          console.log('✅ User role fetched from fallback API:', userWithRoleData);
          return userWithRoleData;
          
        } catch (fallbackError) {
          clearTimeout(fallbackTimeoutId);
          throw new Error(`All endpoints failed: ${fallbackError}`);
        }
      }

      const result = await response.json();
      const userData = result.success ? result.data : result;

      if (!userData || !userData.id) {
        throw new Error('Invalid user data received');
      }

      // Role validation
      const validRoles: UserRole[] = ['ADMIN', 'MANAGER', 'EMPLOYEE'];
      const userRole: UserRole = validRoles.includes(userData.role) ? userData.role : 'EMPLOYEE';

      const userWithRoleData: UserWithRole = {
        id: userData.id,
        name: userData.name || user?.email?.split('@')[0] || 'User',
        email: userData.email || user?.email || '',
        role: userRole,
        employeeId: userData.employee?.id,
      };

      circuitBreaker.onSuccess();
      setCachedUserData(userWithRoleData);
      
      console.log('✅ User role fetched from fast API:', userWithRoleData);
      return userWithRoleData;

    } catch (fetchError) {
      clearTimeout(timeoutId);
      circuitBreaker.onFailure();
      
      console.error('❌ API fetch failed:', fetchError);
      throw fetchError;
    }
  }, [user]);

  // Main fetch function dengan fallback strategy
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
        
        // Background refresh if cache is older than 2 minutes
        if (Date.now() - cachedData.cachedAt > 2 * 60 * 1000) {
          console.log('🔄 Refreshing cache in background...');
          fetchFromAPI().catch(() => {
            // Silent fail for background refresh
            console.log('Background refresh failed, keeping cache');
          });
        }
        return;
      }

      // Step 2: Try API if circuit breaker allows
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
        console.warn('API failed, trying fallback:', apiError);
      }

      // Step 3: Use fallback data
      const fallbackData = getFallbackUserData();
      if (fallbackData && attemptId === fetchAttemptRef.current) {
        console.log('⚠️ Using fallback user data:', fallbackData);
        setUserWithRole(fallbackData);
        setIsUsingCache(false);
        setError('Using offline mode - some features may be limited');
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
  }, [user, session, fetchFromAPI, getFallbackUserData]);

  // Effect untuk fetch user role
  useEffect(() => {
    fetchUserRole();
  }, [fetchUserRole]);

  // Reset state ketika user logout
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
    circuitBreakerStatus: circuitBreaker.getStatus(),
    hasRole,
    isAdmin,
    isManager,
    isEmployee,
    canManageEmployees,
    refreshUserRole,
  };
}
