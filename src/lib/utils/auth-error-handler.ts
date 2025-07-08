/**
 * Enhanced Authentication Error Handler
 * Menangani semua jenis error authentication dengan strategi yang tepat
 */

import { NextResponse } from 'next/server';
import { authErrorResponse } from './stream-handler';

export interface AuthError {
  type: 'timeout' | 'network' | 'circuit_breaker' | 'auth_failed' | 'unknown';
  message: string;
  duration: number;
  retryable: boolean;
  attempt?: number;
  originalError?: Error;
}

export interface AuthContext {
  pathname: string;
  attempt: number;
  totalDuration: number;
  userAgent?: string;
  ip?: string;
}

// Enhanced error classification
export function classifyAuthError(error: Error, duration: number, attempt: number = 1): AuthError {
  const message = error.message.toLowerCase();
  
  // Timeout errors
  if (message.includes('timeout') || message.includes('abort')) {
    return {
      type: 'timeout',
      message: `Authentication timeout after ${duration}ms (attempt ${attempt})`,
      duration,
      retryable: attempt < 3,
      attempt,
      originalError: error
    };
  }
  
  // Network errors
  if (message.includes('fetch failed') || 
      message.includes('network') || 
      message.includes('enotfound') ||
      message.includes('econnreset') ||
      message.includes('econnrefused')) {
    return {
      type: 'network',
      message: `Network connection failed (attempt ${attempt})`,
      duration,
      retryable: attempt < 3,
      attempt,
      originalError: error
    };
  }
  
  // Circuit breaker
  if (message.includes('circuit breaker')) {
    return {
      type: 'circuit_breaker',
      message: 'Authentication service temporarily unavailable, using fallback',
      duration,
      retryable: false,
      attempt,
      originalError: error
    };
  }
  
  // Authentication failed
  if (message.includes('auth') || message.includes('unauthorized') || message.includes('invalid')) {
    return {
      type: 'auth_failed',
      message: 'Authentication credentials invalid',
      duration,
      retryable: false,
      attempt,
      originalError: error
    };
  }
  
  // Unknown error
  return {
    type: 'unknown',
    message: `Authentication error: ${error.message}`,
    duration,
    retryable: attempt < 2,
    attempt,
    originalError: error
  };
}

// Create appropriate response based on error type
export function createAuthErrorResponse(authError: AuthError, context: AuthContext): NextResponse {
  const { type, duration, retryable } = authError;
  
  switch (type) {
    case 'timeout':
      return authErrorResponse(
        `Authentication timed out for ${context.pathname}. Please try again.`,
        {
          type: 'timeout',
          duration,
          retryable,
        },
        408 // Request Timeout
      );
      
    case 'network':
      return authErrorResponse(
        `Network connection failed. Please check your internet connection and try again.`,
        {
          type: 'network',
          duration,
          retryable,
        },
        503 // Service Unavailable
      );
      
    case 'circuit_breaker':
      return authErrorResponse(
        `Authentication service is temporarily unavailable. Please try again in a few moments.`,
        {
          type: 'circuit_breaker',
          duration,
          retryable: false,
        },
        503 // Service Unavailable
      );
      
    case 'auth_failed':
      return authErrorResponse(
        `Authentication failed. Please log in again.`,
        {
          type: 'auth_failed',
          duration,
          retryable: false,
        },
        401 // Unauthorized
      );
      
    default:
      return authErrorResponse(
        `An unexpected error occurred during authentication. Please try again.`,
        {
          type: 'unknown',
          duration,
          retryable,
        },
        500 // Internal Server Error
      );
  }
}

// Log authentication errors with proper categorization
export function logAuthError(authError: AuthError, context: AuthContext): void {
  const { type, message, duration, attempt, originalError } = authError;
  const { pathname, totalDuration, userAgent, ip } = context;
  
  const logData = {
    timestamp: new Date().toISOString(),
    type,
    message,
    pathname,
    attempt,
    duration,
    totalDuration,
    userAgent: userAgent?.substring(0, 100), // Truncate for logging
    ip,
    stack: originalError?.stack?.split('\n')[0] // First line of stack trace
  };
  
  switch (type) {
    case 'timeout':
      console.warn('⏰ Auth timeout:', logData);
      break;
    case 'network':
      console.warn('🌐 Network error:', logData);
      break;
    case 'circuit_breaker':
      console.info('⚡ Circuit breaker active:', logData);
      break;
    case 'auth_failed':
      console.error('🔐 Auth failed:', logData);
      break;
    default:
      console.error('❌ Unknown auth error:', logData);
      break;
  }
}

// Check if error should trigger circuit breaker
export function shouldTriggerCircuitBreaker(authError: AuthError): boolean {
  const { type } = authError;
  
  // Trigger circuit breaker for timeout and network errors
  return type === 'timeout' || type === 'network';
}

// Get user-friendly error message for client
export function getUserFriendlyMessage(authError: AuthError): string {
  const { type } = authError;
  
  switch (type) {
    case 'timeout':
      return 'The system is taking longer than usual to respond. Please try again.';
    case 'network':
      return 'There seems to be a connection issue. Please check your internet and try again.';
    case 'circuit_breaker':
      return 'The authentication service is temporarily busy. Please wait a moment and try again.';
    case 'auth_failed':
      return 'Your session has expired. Please log in again.';
    default:
      return 'Something went wrong. Please try again or contact support if the problem persists.';
  }
}

// Enhanced retry strategy
export function getRetryStrategy(authError: AuthError): {
  shouldRetry: boolean;
  delayMs: number;
  newTimeout: number;
} {
  const { type, attempt = 1 } = authError;
  
  if (!authError.retryable || attempt >= 3) {
    return {
      shouldRetry: false,
      delayMs: 0,
      newTimeout: 0
    };
  }
  
  switch (type) {
    case 'timeout':
      return {
        shouldRetry: true,
        delayMs: Math.min(1000 * attempt, 3000), // Progressive delay
        newTimeout: Math.max(5000 - (attempt * 1000), 2000) // Shorter timeout on retry
      };
      
    case 'network':
      return {
        shouldRetry: true,
        delayMs: Math.min(2000 * attempt, 5000), // Longer delay for network issues
        newTimeout: 5000 // Keep same timeout
      };
      
    default:
      return {
        shouldRetry: false,
        delayMs: 0,
        newTimeout: 0
      };
  }
}
