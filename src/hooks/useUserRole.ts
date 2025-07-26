'use client';

import { useState, useEffect } from 'react';
import { useSupabase } from '@/providers/supabase-provider';

export type UserRole = 'ADMIN' | 'MANAGER' | 'EMPLOYEE';

export interface UserWithRole {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  employeeId?: string;
}

export function useUserRole() {
  const { user, session, isLoading: authLoading } = useSupabase();
  const [userWithRole, setUserWithRole] = useState<UserWithRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user || !session) {
        setUserWithRole(null);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Add timeout for the API call - increased to 15 seconds for database operations
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // Increased to 15s for DB operations

        try {
          // Coba dapatkan data user dari API /users/me with retry mechanism
          const response = await fetch('/api/users/me', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            const errorText = await response.text();
            console.error('API /users/me failed:', response.status, errorText);
            
            // If it's a 401, user might need to re-login
            if (response.status === 401) {
              throw new Error('Authentication expired. Please login again.');
            }
            
            // If it's a timeout (408) or service unavailable (503)
            if (response.status === 408 || response.status === 503) {
              throw new Error('Service temporarily unavailable. Please try again.');
            }
            
            throw new Error(`Failed to fetch user data: ${response.status}`);
          }

          const result = await response.json();
          
          // Check if response has success field (new API format)
          const userData = result.success ? result.data : result;
          
          console.log('👤 User data from API:', {
            id: userData.id,
            email: userData.email,
            role: userData.role,
            hasEmployee: !!userData.employee
          });
          
          setUserWithRole({
            id: userData.id,
            name: userData.name || user.email?.split('@')[0] || 'User',
            email: userData.email || user.email || '',
            role: userData.role || 'EMPLOYEE',
            employeeId: userData.employee?.id,
          });

        } catch (apiError) {
          clearTimeout(timeoutId);
          
          if (apiError instanceof Error && apiError.name === 'AbortError') {
            console.error('API call timed out after 15 seconds');
            throw new Error('Request timed out. Please try again.');
          }
          
          throw apiError;
        }

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('Error fetching user role:', errorMessage);
        setError(errorMessage);
        
        // Fallback ke data minimal dari Supabase
        console.log('Using fallback user data from Supabase auth');
        setUserWithRole({
          id: user.id,
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          email: user.email || '',
          role: 'EMPLOYEE', // Default role
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserRole();
  }, [user, session]);

  // Reset state ketika user logout
  useEffect(() => {
    if (!user) {
      setUserWithRole(null);
      setError(null);
      setIsLoading(false);
    }
  }, [user]);

  const hasRole = (roles: UserRole | UserRole[]): boolean => {
    if (!userWithRole) return false;
    
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    return allowedRoles.includes(userWithRole.role);
  };

  const isAdmin = (): boolean => hasRole('ADMIN');
  const isManager = (): boolean => hasRole('MANAGER');
  const isEmployee = (): boolean => hasRole('EMPLOYEE');
  const canManageEmployees = (): boolean => hasRole(['ADMIN', 'MANAGER']);

  return {
    user: userWithRole,
    role: userWithRole?.role || null,
    isLoading: authLoading || isLoading,
    error,
    hasRole,
    isAdmin,
    isManager,
    isEmployee,
    canManageEmployees,
  };
}
