import { SUPABASE_CONFIG } from './config';

/**
 * Network error types for Supabase operations
 */
export enum SupabaseErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  CONFIG_ERROR = 'CONFIG_ERROR',
  AUTH_ERROR = 'AUTH_ERROR',
  FETCH_FAILED = 'FETCH_FAILED',
  CONNECTION_REFUSED = 'CONNECTION_REFUSED',
  DNS_ERROR = 'DNS_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface SupabaseErrorInfo {
  type: SupabaseErrorType;
  message: string;
  originalError?: Error;
  isRetryable: boolean;
  shouldFallback: boolean;
  userMessage: string;
}

/**
 * Classify Supabase errors for better handling
 */
export const classifySupabaseError = (error: unknown): SupabaseErrorInfo => {
  const errorMessage = (error as Error)?.message || String(error) || 'Unknown error';
  const errorLower = errorMessage.toLowerCase();
  const originalError = error instanceof Error ? error : new Error(String(error));
  
  // Network and fetch errors
  if (errorLower.includes('fetch failed') || errorLower.includes('failed to fetch')) {
    return {
      type: SupabaseErrorType.FETCH_FAILED,
      message: 'Network request failed',
      originalError,
      isRetryable: true,
      shouldFallback: true,
      userMessage: 'Connection issue detected. Please check your internet connection and try again.'
    };
  }
  
  if (errorLower.includes('timeout') || errorLower.includes('timed out')) {
    return {
      type: SupabaseErrorType.TIMEOUT_ERROR,
      message: 'Request timed out',
      originalError,
      isRetryable: true,
      shouldFallback: true,
      userMessage: 'Request is taking too long. Please try again.'
    };
  }
  
  if (errorLower.includes('connection refused') || errorLower.includes('econnrefused')) {
    return {
      type: SupabaseErrorType.CONNECTION_REFUSED,
      message: 'Connection refused by server',
      originalError,
      isRetryable: true,
      shouldFallback: true,
      userMessage: 'Cannot connect to the server. Please try again in a moment.'
    };
  }
  
  if (errorLower.includes('getaddrinfo') || errorLower.includes('dns')) {
    return {
      type: SupabaseErrorType.DNS_ERROR,
      message: 'DNS resolution failed',
      originalError,
      isRetryable: true,
      shouldFallback: true,
      userMessage: 'Network connectivity issue. Please check your connection.'
    };
  }
  
  if (errorLower.includes('network') || errorLower.includes('socket')) {
    return {
      type: SupabaseErrorType.NETWORK_ERROR,
      message: 'Network error occurred',
      originalError,
      isRetryable: true,
      shouldFallback: true,
      userMessage: 'Network error occurred. Please try again.'
    };
  }
  
  // Configuration errors
  if (errorLower.includes('invalid api key') || errorLower.includes('unauthorized')) {
    return {
      type: SupabaseErrorType.CONFIG_ERROR,
      message: 'Invalid API configuration',
      originalError,
      isRetryable: false,
      shouldFallback: false,
      userMessage: 'Configuration error. Please contact support.'
    };
  }
  
  // Auth specific errors
  if (errorLower.includes('auth') || errorLower.includes('authentication') || errorLower.includes('session')) {
    return {
      type: SupabaseErrorType.AUTH_ERROR,
      message: 'Authentication error',
      originalError,
      isRetryable: false,
      shouldFallback: true,
      userMessage: 'Authentication issue. Please sign in again.'
    };
  }
  
  // Default case
  return {
    type: SupabaseErrorType.UNKNOWN_ERROR,
    message: errorMessage,
    originalError,
    isRetryable: true,
    shouldFallback: true,
    userMessage: 'An unexpected error occurred. Please try again.'
  };
};

/**
 * Retry wrapper for Supabase operations with exponential backoff
 */
export const withRetry = async <T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelay?: number;
    backoffMultiplier?: number;
    timeout?: number;
    shouldRetry?: (error: SupabaseErrorInfo) => boolean;
  } = {}
): Promise<T> => {
  const {
    maxRetries = SUPABASE_CONFIG.MAX_RETRIES,
    baseDelay = SUPABASE_CONFIG.RETRY_DELAY,
    backoffMultiplier = SUPABASE_CONFIG.BACKOFF_MULTIPLIER,
    timeout = SUPABASE_CONFIG.NETWORK_TIMEOUT,
    shouldRetry = (error) => error.isRetryable
  } = options;
  
  let lastError: SupabaseErrorInfo;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Add timeout wrapper
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Operation timed out after ${timeout}ms`));
        }, timeout);
      });
      
      const result = await Promise.race([operation(), timeoutPromise]);
      return result;
    } catch (error) {
      lastError = classifySupabaseError(error);
      
      // Don't retry on the last attempt or if not retryable
      if (attempt === maxRetries || !shouldRetry(lastError)) {
        break;
      }
      
      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(backoffMultiplier, attempt);
      
      console.warn(`🔄 Supabase operation failed (attempt ${attempt + 1}/${maxRetries + 1}):`, {
        error: lastError.message,
        type: lastError.type,
        retryAfter: `${delay}ms`
      });
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // All retries failed
  console.error('❌ Supabase operation failed after all retries:', {
    error: lastError!.message,
    type: lastError!.type,
    attempts: maxRetries + 1
  });
  
  throw lastError!.originalError || new Error(lastError!.message);
};

/**
 * Create a timeout wrapper for any async operation
 */
export const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage = 'Operation timed out'
): Promise<T> => {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`${errorMessage} after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  
  return Promise.race([promise, timeoutPromise]);
};

/**
 * Safe wrapper for Supabase client operations
 */
export const safeSupabaseOperation = async <T>(
  operation: () => Promise<T>,
  options: {
    operationName?: string;
    timeout?: number;
    maxRetries?: number;
    fallbackValue?: T;
    shouldThrow?: boolean;
  } = {}
): Promise<T | null> => {
  const {
    operationName = 'Supabase operation',
    timeout = SUPABASE_CONFIG.NETWORK_TIMEOUT,
    maxRetries = SUPABASE_CONFIG.MAX_RETRIES,
    fallbackValue = null as T,
    shouldThrow = false
  } = options;
  
  try {
    return await withRetry(
      () => withTimeout(operation(), timeout, `${operationName} timed out`),
      { maxRetries }
    );
  } catch (error) {
    const errorInfo = classifySupabaseError(error);
    
    console.error(`❌ ${operationName} failed:`, {
      type: errorInfo.type,
      message: errorInfo.message,
      userMessage: errorInfo.userMessage
    });
    
    if (shouldThrow) {
      throw error;
    }
    
    return fallbackValue;
  }
};
