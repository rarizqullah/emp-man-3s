/**
 * Centralized Supabase configuration with robust validation and fallbacks
 * This ensures all Supabase clients use validated environment variables
 */

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
  isValid: boolean;
  errors: string[];
}

/**
 * Validate and get Supabase configuration
 */
export const getSupabaseConfig = (): SupabaseConfig => {
  const errors: string[] = [];
  
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  // Validate URL
  if (!url) {
    errors.push('NEXT_PUBLIC_SUPABASE_URL is missing');
  } else if (!url.startsWith('https://') || !url.includes('.supabase.co')) {
    errors.push('NEXT_PUBLIC_SUPABASE_URL format is invalid');
  }
  
  // Validate Anon Key
  if (!anonKey) {
    errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is missing');
  } else if (anonKey.length < 100) {
    errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY appears to be invalid (too short)');
  }
  
  // Validate Service Role Key (optional for admin operations)
  if (serviceRoleKey && serviceRoleKey.length < 100) {
    errors.push('SUPABASE_SERVICE_ROLE_KEY appears to be invalid (too short)');
  }
  
  return {
    url: url || '',
    anonKey: anonKey || '',
    serviceRoleKey,
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Global configuration for Supabase operations
 */
export const SUPABASE_CONFIG = {
  // Network timeout configurations
  NETWORK_TIMEOUT: 5000, // 5 seconds for network operations
  AUTH_TIMEOUT: 3000, // 3 seconds for auth operations
  FAST_TIMEOUT: 1500, // 1.5 seconds for fast operations
  
  // Retry configurations
  MAX_RETRIES: 2,
  RETRY_DELAY: 1000, // 1 second base delay
  BACKOFF_MULTIPLIER: 1.5,
  
  // Circuit breaker configurations
  FAILURE_THRESHOLD: 3,
  RECOVERY_TIMEOUT: 15000, // 15 seconds
  
  // Cookie configurations
  MAX_COOKIE_SIZE: 3800,
  COOKIE_MAX_AGE: 100 * 365 * 24 * 60 * 60, // 100 years
} as const;

/**
 * Check if we're in a server environment
 */
export const isServer = typeof window === 'undefined';

/**
 * Check if we're in production
 */
export const isProduction = process.env.NODE_ENV === 'production';

/**
 * Get environment-specific configurations
 */
export const getEnvironmentConfig = () => {
  return {
    isServer,
    isProduction,
    isDevelopment: !isProduction,
    isClient: !isServer,
    timeout: isProduction ? SUPABASE_CONFIG.AUTH_TIMEOUT : SUPABASE_CONFIG.NETWORK_TIMEOUT,
  };
};
