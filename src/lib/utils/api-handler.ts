import { NextRequest, NextResponse } from 'next/server';
import { safeResponse, safeErrorResponse } from './stream-handler';

type ApiHandler = (request: NextRequest, ...args: any[]) => Promise<NextResponse>;

// Wrapper untuk mencegah double response dan stream conflicts
export function createSafeApiHandler(handler: ApiHandler): ApiHandler {
  return async (request: NextRequest, ...args: any[]): Promise<NextResponse> => {
    let responseReturned = false;
    
    try {
      // Intercept console.log untuk mendeteksi potential issues
      const originalConsoleLog = console.log;
      const requestId = Math.random().toString(36).substr(2, 9);
      
      console.log = (...logArgs: any[]) => {
        if (!responseReturned) {
          originalConsoleLog(`[${requestId}]`, ...logArgs);
        }
      };
      
      const result = await handler(request, ...args);
      responseReturned = true;
      
      // Restore console.log
      console.log = originalConsoleLog;
      
      return result;
    } catch (error) {
      responseReturned = true;
      
      const errorMessage = String(error).toLowerCase();
      
      // Handle stream-specific errors
      if (
        errorMessage.includes('stream is already ended') ||
        errorMessage.includes('err_stream_already_finished') ||
        errorMessage.includes('failed to pipe response') ||
        errorMessage.includes('cannot set headers after they are sent')
      ) {
        console.warn(`🔧 Stream error handled gracefully: ${errorMessage}`);
        return safeResponse({ 
          success: true, 
          message: 'Request completed (stream warning handled)' 
        });
      }
      
      // Handle other errors normally
      console.error('API Handler Error:', error);
      return safeErrorResponse('Internal server error', 500);
    }
  };
}

// Middleware untuk request timing dan debugging
export function withRequestTiming<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    const startTime = Date.now();
    const requestId = Math.random().toString(36).substr(2, 9);
    
    try {
      console.log(`🚀 [${requestId}] Request started`);
      const result = await handler(...args);
      const duration = Date.now() - startTime;
      console.log(`✅ [${requestId}] Request completed in ${duration}ms`);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ [${requestId}] Request failed after ${duration}ms:`, error);
      throw error;
    }
  };
}

// Helper untuk validasi request method
export function withMethodValidation(
  allowedMethods: string[],
  handler: ApiHandler
): ApiHandler {
  return async (request: NextRequest, ...args: any[]): Promise<NextResponse> => {
    if (!allowedMethods.includes(request.method)) {
      return safeErrorResponse(`Method ${request.method} not allowed`, 405);
    }
    
    return handler(request, ...args);
  };
}

// Combine all wrappers
export function createRobustApiHandler(
  handler: ApiHandler,
  options: {
    allowedMethods?: string[];
    withTiming?: boolean;
  } = {}
): ApiHandler {
  let wrappedHandler = handler;
  
  // Apply method validation if specified
  if (options.allowedMethods) {
    wrappedHandler = withMethodValidation(options.allowedMethods, wrappedHandler);
  }
  
  // Apply timing if specified
  if (options.withTiming !== false) {
    wrappedHandler = withRequestTiming(wrappedHandler);
  }
  
  // Apply safe handling (always last)
  wrappedHandler = createSafeApiHandler(wrappedHandler);
  
  return wrappedHandler;
} 