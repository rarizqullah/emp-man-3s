import { NextRequest, NextResponse } from 'next/server';
import { createMiddlewareSupabaseClient } from '@/lib/supabase/server';
import { withAuthTimeout } from '@/lib/utils/stream-handler';

// Type definitions
interface AuthUser {
  id: string;
  email?: string;
  role?: string;
}

interface AuthResult {
  success: boolean;
  user?: AuthUser;
  error?: string;
  duration: number;
  usedFallback?: boolean;
}

// Circuit breaker untuk auth operations
class AuthCircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private isOpen = false;
  private readonly failureThreshold = 3; // Lebih konservatif
  private readonly recoveryTimeout = 20000; // 20 detik recovery time

  shouldBypass(): boolean {
    if (!this.isOpen) return false;
    
    const now = Date.now();
    if (now - this.lastFailureTime >= this.recoveryTimeout) {
      this.isOpen = false;
      this.failureCount = 0;
      console.log('🔄 Auth circuit breaker reset');
      return false;
    }
    
    return true;
  }

  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.failureThreshold) {
      this.isOpen = true;
      console.warn(`⚡ Auth circuit breaker opened after ${this.failureCount} failures`);
    }
  }

  recordSuccess(): void {
    this.failureCount = 0;
    this.isOpen = false;
  }

  getStatus() {
    return {
      isOpen: this.isOpen,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime
    };
  }
}

// Global circuit breaker instance
const authCircuitBreaker = new AuthCircuitBreaker();

// JWT fallback decoder untuk network failures
function parseSupabaseJWT(token: string): { sub: string; email?: string; exp?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf8')
    );
    
    if (!payload.sub) return null;
    
    // Check expiration
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return null;
    }
    
    return payload;
  } catch {
    return null;
  }
}

// Helper untuk mengambil chunked cookies
function getChunkedCookie(req: NextRequest, name: string): string | undefined {
  const mainCookie = req.cookies.get(name)?.value;
  if (mainCookie) {
    return mainCookie;
  }

  const chunks: string[] = [];
  let index = 0;
  
  while (true) {
    const chunkName = `${name}.${index}`;
    const chunk = req.cookies.get(chunkName)?.value;
    
    if (!chunk) break;
    
    chunks.push(chunk);
    index++;
  }
  
  return chunks.length > 0 ? chunks.join('') : undefined;
}

// JWT fallback auth check
function checkJWTFallback(req: NextRequest): { valid: boolean; user?: AuthUser } {
  try {
    const accessToken = getChunkedCookie(req, 'sb-access-token');
    
    if (!accessToken) {
      return { valid: false };
    }
    
    const payload = parseSupabaseJWT(accessToken);
    
    if (!payload) {
      return { valid: false };
    }
    
    return {
      valid: true,
      user: {
        id: payload.sub,
        email: payload.email || '',
        role: 'authenticated'
      }
    };
  } catch {
    return { valid: false };
  }
}

// Main authentication function
export async function authenticateMiddlewareRequest(
  req: NextRequest,
  pathname: string,
  timeoutMs: number = 8000
): Promise<AuthResult> {
  const startTime = Date.now();
  
  try {
    // Check circuit breaker first
    if (authCircuitBreaker.shouldBypass()) {
      console.log(`⚡ Circuit breaker open, using JWT fallback for ${pathname}`);
      const fallbackResult = checkJWTFallback(req);
      
      if (fallbackResult.valid) {
        return {
          success: true,
          user: fallbackResult.user,
          duration: Date.now() - startTime,
          usedFallback: true
        };
      }
      
      return {
        success: false,
        error: 'Circuit breaker open and no valid JWT token',
        duration: Date.now() - startTime
      };
    }

    // Create Supabase client
    const res = NextResponse.next();
    const supabase = createMiddlewareSupabaseClient(req, res);

    // Perform auth check with timeout
    const { data: { user }, error } = await withAuthTimeout(
      supabase.auth.getUser(),
      timeoutMs,
      `auth check for ${pathname}`
    );

    const duration = Date.now() - startTime;

    if (error || !user) {
      authCircuitBreaker.recordFailure();
      
      // Try JWT fallback
      console.log(`🔄 Primary auth failed for ${pathname}, trying JWT fallback...`);
      const fallbackResult = checkJWTFallback(req);
      
      if (fallbackResult.valid) {
        console.log(`✅ JWT fallback successful for ${pathname}`);
        return {
          success: true,
          user: fallbackResult.user,
          duration,
          usedFallback: true
        };
      }
      
      return {
        success: false,
        error: error?.message || 'No user found',
        duration
      };
    }

    // Success
    authCircuitBreaker.recordSuccess();
    
    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: 'authenticated'
      },
      duration
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    authCircuitBreaker.recordFailure();
    
    const errorMessage = (error as Error).message;
    console.warn(`⚠️ Auth error for ${pathname}:`, {
      error: errorMessage,
      duration,
      circuitBreakerStatus: authCircuitBreaker.getStatus()
    });

    // Try JWT fallback on any error
    const fallbackResult = checkJWTFallback(req);
    if (fallbackResult.valid) {
      console.log(`✅ JWT fallback successful after error for ${pathname}`);
      return {
        success: true,
        user: fallbackResult.user,
        duration,
        usedFallback: true
      };
    }

    return {
      success: false,
      error: errorMessage,
      duration
    };
  }
}

// Quick auth check for login/register pages
export async function quickAuthCheck(
  req: NextRequest,
  pathname: string
): Promise<AuthResult> {
  return authenticateMiddlewareRequest(req, pathname, 3000); // 3 second timeout
}

// Get circuit breaker status for monitoring
export function getAuthCircuitBreakerStatus() {
  return authCircuitBreaker.getStatus();
}
