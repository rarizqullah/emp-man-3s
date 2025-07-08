import { NextResponse } from 'next/server';

/**
 * Safe response helper to prevent stream errors
 */
export function safeResponse(data: any, options?: { status?: number; headers?: Record<string, string> }) {
  try {
    const response = NextResponse.json(data, {
      status: options?.status || 200,
      headers: options?.headers,
    });
    
    return response;
  } catch (error) {
    console.error('❌ Response creation error:', error);
    
    // Fallback response
    return new NextResponse(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Safe redirect helper to prevent stream errors
 */
export function safeRedirect(url: string) {
  try {
    return NextResponse.redirect(url);
  } catch (error) {
    console.error('❌ Redirect error:', error);
    
    // Fallback response
    return new NextResponse(
      JSON.stringify({ error: 'Redirect failed', redirectTo: url }),
      {
        status: 302,
        headers: { 
          'Content-Type': 'application/json',
          'Location': url 
        },
      }
    );
  }
}

/**
 * Safe error response helper
 */
export function safeErrorResponse(error: any, status: number = 500) {
  try {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { error: errorMessage },
      { status }
    );
  } catch (responseError) {
    console.error('❌ Error response creation failed:', responseError);
    
    // Fallback response
    return new NextResponse(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Check if response is already sent/closed
 */
export function isResponseClosed(response: Response): boolean {
  try {
    // Check if response is already closed by trying to access body
    if (response.body && response.body.locked) {
      return true;
    }
    
    return false;
  } catch (error) {
    // If error accessing response, consider it closed
    return true;
  }
}

/**
 * Rate limiting helper
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  
  constructor(
    private windowMs: number = 60000, // 1 minute
    private maxRequests: number = 100
  ) {}
  
  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < this.windowMs);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    // Add current request
    validRequests.push(now);
    this.requests.set(identifier, validRequests);
    
    return true;
  }
  
  getRemainingRequests(identifier: string): number {
    const requests = this.requests.get(identifier) || [];
    const validRequests = requests.filter(time => Date.now() - time < this.windowMs);
    
    return Math.max(0, this.maxRequests - validRequests.length);
  }
}

/**
 * Default rate limiter instance
 */
export const defaultRateLimiter = new RateLimiter();

/**
 * CORS headers helper
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

/**
 * Safe CORS response
 */
export function safeCorsResponse(data: any, options?: { status?: number }) {
  try {
    return NextResponse.json(data, {
      status: options?.status || 200,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error('❌ CORS response error:', error);
    
    return new NextResponse(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        },
      }
    );
  }
} 