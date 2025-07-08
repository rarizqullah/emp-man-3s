import { NextResponse } from 'next/server';

// Safe response wrapper untuk mencegah stream errors
export function safeResponse(data: any, options?: ResponseInit): NextResponse {
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

// Safe error response
export function safeErrorResponse(
  message: string, 
  status: number = 500,
  additionalData?: Record<string, any>
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
export function withStreamErrorHandling<T extends any[]>(
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

// Process error handler untuk development
export function suppressStreamErrors() {
  if (process.env.NODE_ENV === 'development') {
    // Intercept dan suppress stream-related errors
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      const message = args.join(' ').toLowerCase();
      
      // Skip logging stream errors yang tidak critical
      if (
        message.includes('failed to pipe response') ||
        message.includes('stream is already ended') ||
        message.includes('err_stream_already_finished')
      ) {
        // Hanya log sebagai warning, bukan error
        console.warn('🔧 Development stream warning (suppressed):', args[0]);
        return;
      }
      
      // Log error lainnya secara normal
      originalConsoleError.apply(console, args);
    };
  }
} 