import { NextResponse } from 'next/server';

type JSONValue = string | number | boolean | null | { [key: string]: JSONValue } | JSONValue[];

// Enhanced auth timeout handler with retry awareness
export function withAuthTimeout<T>(
  promise: Promise<T>, 
  timeoutMs: number = 5000, // Reduced from 8000 to 5000
  operation: string = 'auth',
  attempt: number = 1
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`${operation} timeout after ${timeoutMs}ms (attempt ${attempt})`));
      }, timeoutMs);
      
      // Cleanup timeout if promise resolves
      promise.finally(() => clearTimeout(timeoutId));
    })
  ]);
}

// Enhanced error response with better debugging
export function authErrorResponse(
  message: string,
  details?: { type?: string; duration?: number; retryable?: boolean },
  status: number = 401
): NextResponse {
  try {
    const response = NextResponse.json(
      { 
        error: message,
        type: details?.type || 'auth_error',
        duration: details?.duration,
        retryable: details?.retryable || false,
        timestamp: new Date().toISOString()
      },
      { 
        status,
        headers: {
          'Connection': 'close',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'X-Auth-Error': 'true'
        }
      }
    );
    
    return response;
  } catch (error) {
    console.warn('⚠️ Auth error response streaming issue:', error);
    return new NextResponse(
      JSON.stringify({ 
        error: 'Authentication failed',
        type: 'auth_error'
      }),
      { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Safe response wrapper untuk mencegah stream errors
export function safeResponse(data: JSONValue, options?: ResponseInit): NextResponse {
  try {
    const response = NextResponse.json(data, options);
    
    // Tambahkan header untuk mencegah chunked encoding conflicts
    response.headers.set('Connection', 'close');
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    return response;
  } catch (error) {
    // Fallback jika terjadi error saat membuat response
    console.warn('⚠️ Stream response error (non-critical):', error);
    return NextResponse.json(
      { error: 'Response streaming issue' },
      { status: 500 }
    );
  }
}

// API route handler wrapper untuk mencegah multiple responses
export function withSingleResponse<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    let responseAlreadySent = false;
    let finalResponse: NextResponse | null = null;
    
    // Create a proxy untuk NextResponse.json yang mencegah multiple calls
    const originalNextResponseJson = NextResponse.json;
    const safeResponseWrapper = function(data: JSONValue, init?: ResponseInit): NextResponse {
      if (responseAlreadySent) {
        console.warn('⚠️ Attempted to send multiple responses - ignoring duplicate');
        return finalResponse || new NextResponse(null, { status: 200 });
      }
      responseAlreadySent = true;
      finalResponse = safeResponse(data, init);
      return finalResponse;
    };

    try {
      // Temporarily replace NextResponse.json dengan safe wrapper
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (NextResponse as any).json = safeResponseWrapper;
      
      const result = await handler(...args);
      
      // Restore original NextResponse.json
      NextResponse.json = originalNextResponseJson;
      
      // Jika tidak ada response yang dikirim dari wrapper, gunakan result dari handler
      if (!responseAlreadySent) {
        return result;
      }
      
      return finalResponse || result;
    } catch (error) {
      // Restore original NextResponse.json
      NextResponse.json = originalNextResponseJson;
      
      // Deteksi stream errors
      const errorMessage = String(error).toLowerCase();
      if (
        errorMessage.includes('stream is already ended') ||
        errorMessage.includes('err_stream_already_finished') ||
        errorMessage.includes('failed to pipe response')
      ) {
        console.warn('⚠️ Stream error handled gracefully:', errorMessage);
        if (!responseAlreadySent) {
          return safeResponse({ error: 'Request completed with stream warning' }, { status: 200 });
        }
        return finalResponse || new NextResponse(null, { status: 200 });
      }
      
      // Handle other errors normally
      if (!responseAlreadySent) {
        return safeResponse(
          { error: 'Internal server error' },
          { status: 500 }
        );
      }
      
      return finalResponse || safeResponse({ error: 'Internal server error' }, { status: 500 });
    }
  };
}

// Safe error response
export function safeErrorResponse(
  message: string, 
  status: number = 500,
  additionalData?: Record<string, JSONValue>
): NextResponse {
  try {
    return NextResponse.json(
      { error: message, ...additionalData },
      { 
        status,
        headers: {
          'Connection': 'close',
          'Cache-Control': 'no-cache'
        }
      }
    );
  } catch (error) {
    console.warn('⚠️ Error response streaming issue (non-critical):', error);
    // Ultimate fallback
    return new NextResponse(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Wrapper untuk API routes yang rawan stream errors
export function withStreamErrorHandling<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      const result = await handler(...args);
      return result;
    } catch (error) {
      // Deteksi stream errors
      const errorMessage = String(error).toLowerCase();
      if (
        errorMessage.includes('stream is already ended') ||
        errorMessage.includes('err_stream_already_finished') ||
        errorMessage.includes('failed to pipe response')
      ) {
        console.warn('⚠️ Stream error handled gracefully (development only):', errorMessage);
        return safeErrorResponse('Request completed with stream warning', 200);
      }
      
      // Re-throw non-stream errors
      throw error;
    }
  };
}

// Process error handler untuk development - Edge Runtime compatible
// Global flag untuk mencegah multiple initialization
declare global {
  // eslint-disable-next-line no-var
  var __STREAM_ERRORS_SUPPRESSED__: boolean | undefined;
}

export function suppressStreamErrors() {
  // Prevent multiple initialization using global flag
  if (globalThis.__STREAM_ERRORS_SUPPRESSED__) {
    return;
  }
  
  // Safe runtime check without using process.env directly in Edge Runtime
  let isDevelopment = false;
  try {
    // Safe way to check environment
    isDevelopment = typeof process !== 'undefined' && process.env?.NODE_ENV === 'development';
  } catch {
    // Edge Runtime fallback - assume development for error suppression
    isDevelopment = true;
  }

  if (isDevelopment) {
    // Enhanced error suppression
    const originalConsoleError = console.error;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    console.error = (...args: any[]) => {
      const message = args.join(' ').toLowerCase();
      
      // Skip logging stream errors yang tidak critical
      if (
        message.includes('failed to pipe response') ||
        message.includes('stream is already ended') ||
        message.includes('err_stream_already_finished') ||
        message.includes('cannot set headers after they are sent') ||
        message.includes('response already sent')
      ) {
        // Hanya log sebagai warning, bukan error
        console.warn('🔧 Development stream warning (suppressed):', args[0]);
        return;
      }
      
      // Log error lainnya secara normal
      originalConsoleError.apply(console, args);
    };
    
    // Set global flag to prevent re-initialization
    globalThis.__STREAM_ERRORS_SUPPRESSED__ = true;
    
    // Skip process.on untuk Edge Runtime - hanya console error handling yang aman
    console.info('🔧 Stream error suppression initialized (Edge Runtime compatible)');
  }
}