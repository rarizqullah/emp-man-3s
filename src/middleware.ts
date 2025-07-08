import { createMiddlewareSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import '@/lib/global-error-handler'; // Initialize global error handling

// JWT fallback untuk network failures
interface JWTPayload {
  sub: string;
  email?: string;
  exp?: number;
  iat?: number;
}

// Initialize stream error suppression sekali saja (bukan di setiap request)
// Global flag untuk mencegah multiple initialization
declare global {
  // eslint-disable-next-line no-var
  var __MIDDLEWARE_INITIALIZED__: boolean | undefined;
}

// Inisialisasi hanya sekali untuk seluruh aplikasi dengan lazy loading
function initializeOnce() {
  if (!globalThis.__MIDDLEWARE_INITIALIZED__) {
    // Don't call suppressStreamErrors here since it's already called in global-error-handler
    globalThis.__MIDDLEWARE_INITIALIZED__ = true;
    // Only log once during initialization
    if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
      console.log('🔧 Middleware initialized successfully');
    }
  }
}

// Initialize immediately but only once
initializeOnce();

// Enhanced circuit breaker untuk mencegah cascading failures
class AuthCircuitBreaker {
  private failureCount = 0;
  private networkFailureCount = 0;
  private lastFailureTime = 0;
  private lastNetworkFailureTime = 0;
  private isOpen = false;
  private readonly failureThreshold = 3; // Open after 3 failures
  private readonly networkFailureThreshold = 2; // Open faster for network errors
  private readonly recoveryTimeout = 15000; // 15 second recovery time
  private readonly networkRecoveryTimeout = 10000; // Faster recovery for network issues

  shouldBypass(): boolean {
    const now = Date.now();
    
    // Check for network-specific bypass
    if (this.networkFailureCount >= this.networkFailureThreshold) {
      if (now - this.lastNetworkFailureTime >= this.networkRecoveryTimeout) {
        this.networkFailureCount = 0;
        console.log('🔄 Network circuit breaker reset');
        return false;
      }
      return true;
    }
    
    // Check for general circuit breaker
    if (!this.isOpen) return false;
    
    if (now - this.lastFailureTime >= this.recoveryTimeout) {
      this.isOpen = false;
      this.failureCount = 0;
      console.log('🔄 Circuit breaker reset - attempting normal auth');
      return false;
    }
    
    return true;
  }

  recordFailure(isNetworkError: boolean = false): void {
    const now = Date.now();
    
    if (isNetworkError) {
      this.networkFailureCount++;
      this.lastNetworkFailureTime = now;
      console.warn(`🌐 Network failure recorded (${this.networkFailureCount}/${this.networkFailureThreshold})`);
    }
    
    this.failureCount++;
    this.lastFailureTime = now;
    
    if (this.failureCount >= this.failureThreshold) {
      this.isOpen = true;
      console.warn(`⚡ Circuit breaker opened after ${this.failureCount} failures - using fallback`);
    }
  }

  recordSuccess(): void {
    this.failureCount = 0;
    this.networkFailureCount = 0;
    this.isOpen = false;
  }

  // Health check method
  getStatus() {
    return {
      isOpen: this.isOpen,
      failureCount: this.failureCount,
      networkFailureCount: this.networkFailureCount,
      shouldBypass: this.shouldBypass()
    };
  }

  // Reset method untuk exceptional cases
  reset(): void {
    this.failureCount = 0;
    this.networkFailureCount = 0;
    this.lastFailureTime = 0;
    this.lastNetworkFailureTime = 0;
    this.isOpen = false;
    console.log('🔄 Circuit breaker manually reset');
  }
}

const authCircuitBreaker = new AuthCircuitBreaker();

// Optimized timeout configuration - lebih responsif
const AUTH_TIMEOUT = 5000; // 5 detik - lebih agresif untuk mencegah long waits
const FAST_AUTH_TIMEOUT = 2000; // 2 detik untuk checks cepat
const MAX_AUTH_RETRIES = 2; // Maksimal 2 retry (total 3 attempts)

// Tracking metrics untuk auth operations
const authMetrics = {
  totalRequests: 0,
  successfulAuthentications: 0,
  failedAuthentications: 0,
  timeoutCount: 0,
  retryCount: 0,
  averageResponseTime: 0,
  responseTimes: [] as number[],
};

// Performance logging - only in development or slow requests
function logPerformanceMetrics() {
  // Safe environment check for Edge Runtime
  let isProduction = false;
  try {
    isProduction = typeof process !== 'undefined' && process.env?.NODE_ENV === 'production';
  } catch {
    // Edge Runtime fallback - assume not production
    isProduction = false;
  }
  
  if (isProduction) return;
  
  if (authMetrics.totalRequests > 0 && authMetrics.totalRequests % 100 === 0) {
    console.log('📊 Auth Performance Summary:', {
      totalRequests: authMetrics.totalRequests,
      avgResponseTime: `${Math.round(authMetrics.averageResponseTime)}ms`,
      timeoutRate: `${((authMetrics.timeoutCount / authMetrics.totalRequests) * 100).toFixed(2)}%`,
      retryRate: `${((authMetrics.retryCount / authMetrics.totalRequests) * 100).toFixed(2)}%`,
    });
  }
}

// Enhanced cleanup untuk memory management
function cleanupOldMetrics() {
  // Keep only last 100 response times
  if (authMetrics.responseTimes.length > 100) {
    authMetrics.responseTimes = authMetrics.responseTimes.slice(-100);
  }
  
  // Recalculate average from recent data
  if (authMetrics.responseTimes.length > 0) {
    const sum = authMetrics.responseTimes.reduce((a, b) => a + b, 0);
    authMetrics.averageResponseTime = sum / authMetrics.responseTimes.length;
  }
}

// JWT fallback decoder untuk network failures
function parseSupabaseJWT(token: string): JWTPayload | null {
  try {
    // Basic JWT decode tanpa verification untuk fallback
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf8')
    );
    
    // Validate required fields
    if (!payload.sub) return null;
    
    // Check expiration
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      console.log('JWT token expired, cannot use fallback');
      return null;
    }
    
    return payload as JWTPayload;
  } catch (error) {
    console.warn('Failed to parse JWT for fallback:', error);
    return null;
  }
}

// Helper untuk mengambil chunked cookies (sama seperti di supabase server)
function getChunkedCookie(req: NextRequest, name: string): string | undefined {
  // Coba ambil cookie utama dulu
  const mainCookie = req.cookies.get(name)?.value;
  if (mainCookie) {
    return mainCookie;
  }

  // Jika tidak ada, coba ambil chunked cookies
  const chunks: string[] = [];
  let index = 0;
  
  while (true) {
    const chunkName = `${name}.${index}`;
    const chunk = req.cookies.get(chunkName)?.value;
    
    if (!chunk) {
      break;
    }
    
    chunks.push(chunk);
    index++;
  }
  
  if (chunks.length > 0) {
    return chunks.join('');
  }
  
  return undefined;
}

// Enhanced JWT fallback auth check dengan circuit breaker
function checkJWTFallback(req: NextRequest): { valid: boolean; user?: { id: string; email: string; role: string } } {
  try {
    const accessToken = getChunkedCookie(req, 'sb-access-token');
    
    if (!accessToken) {
      return { valid: false };
    }
    
    const payload = parseSupabaseJWT(accessToken);
    
    if (!payload) {
      return { valid: false };
    }
    
    console.log(`✅ JWT fallback valid for user: ${payload.sub}`);
    
    // Return minimal user object
    return {
      valid: true,
      user: {
        id: payload.sub,
        email: payload.email || '',
        role: 'authenticated'
      }
    };
  } catch (error) {
    console.warn('JWT fallback check failed:', error);
    return { valid: false };
  }
}

// Enhanced timeout helper dengan better error detection dan retry limits
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string, attempt: number = 1): Promise<T> {
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

// Enhanced auth check dengan intelligent retry dan fast fallback
async function enhancedAuthCheck(
  authFunction: () => Promise<{ data: { user: { id: string; email?: string } | null }; error: { message: string } | null }>,
  pathname: string,
  req: NextRequest
): Promise<{ data: { user: { id: string; email?: string } | null }; error: { message: string } | null }> {
  // IMMEDIATE JWT fallback check for faster response
  const jwtFallback = checkJWTFallback(req);
  if (jwtFallback.valid && authCircuitBreaker.shouldBypass()) {
    console.log(`⚡ Circuit breaker open, using immediate JWT fallback for ${pathname}`);
    return {
      data: { user: jwtFallback.user || null },
      error: null
    };
  }

  let attempt = 1;
  let totalDuration = 0;
  const maxTotalDuration = 8000; // Reduced from 10s to 8s
  const retryDelays = [0, 500, 1000]; // Faster retry delays

  while (attempt <= MAX_AUTH_RETRIES) {
    const attemptStart = Date.now();
    
    try {
      // Progressive timeout reduction for faster failures
      const baseTimeout = Math.max(AUTH_TIMEOUT - (attempt - 1) * 1500, 2000);
      console.log(`🔍 Auth attempt ${attempt}/${MAX_AUTH_RETRIES} for ${pathname} (timeout: ${baseTimeout}ms)`);
      
      // Wrap auth function with additional error handling
      const wrappedAuthFunction = async () => {
        try {
          return await authFunction();
        } catch (error) {
          const errorMsg = (error as Error).message || String(error);
          
          // Immediate detection of network errors
          if (errorMsg.includes('fetch failed') || 
              errorMsg.includes('Failed to fetch') ||
              errorMsg.includes('network error') ||
              errorMsg.includes('ENOTFOUND') ||
              errorMsg.includes('ECONNRESET') ||
              errorMsg.includes('ECONNREFUSED')) {
            
            console.log(`🌐 Network error detected immediately, trying JWT fallback before timeout...`);
            
            // Try JWT fallback immediately on network errors
            if (jwtFallback.valid) {
              console.log(`✅ Immediate JWT fallback successful for ${pathname}`);
              authCircuitBreaker.recordFailure(true);
              return {
                data: { user: jwtFallback.user || null },
                error: null
              };
            }
          }
          
          throw error;
        }
      };
      
      const result = await withTimeout(wrappedAuthFunction(), baseTimeout, pathname, attempt);
      
      const attemptDuration = Date.now() - attemptStart;
      console.log(`✅ Auth success on attempt ${attempt} after ${attemptDuration}ms for ${pathname}`);
      
      authCircuitBreaker.recordSuccess();
      authMetrics.successfulAuthentications++;
      authMetrics.responseTimes.push(attemptDuration);
      
      return result;
      
    } catch (error) {
      const attemptDuration = Date.now() - attemptStart;
      totalDuration += attemptDuration;
      const errorType = getErrorType(error as Error);
      
      console.warn(`⚠️ Auth attempt ${attempt}/${MAX_AUTH_RETRIES} failed for ${pathname}: {
  error: '${(error as Error).message}',
  type: '${errorType}',
  duration: ${attemptDuration}ms,
  totalDuration: ${totalDuration}ms
}`);
      
      authMetrics.failedAuthentications++;
      
      // Record timeout metrics
      if (errorType === 'timeout') {
        authMetrics.timeoutCount++;
      }
      
      // For any error, try JWT fallback immediately if available
      if (jwtFallback.valid && (errorType === 'network' || errorType === 'timeout' || attempt === MAX_AUTH_RETRIES)) {
        console.log(`🔍 Using JWT fallback after ${errorType} error (attempt ${attempt})`);
        authCircuitBreaker.recordFailure(errorType === 'network');
        return {
          data: { user: jwtFallback.user || null },
          error: null
        };
      }
      
      // If total duration exceeded or last attempt, fail
      if (attempt >= MAX_AUTH_RETRIES || totalDuration >= maxTotalDuration) {
        console.error(`❌ All auth attempts failed for ${pathname} after ${totalDuration}ms`);
        authCircuitBreaker.recordFailure(errorType === 'network');
        
        // Last chance JWT fallback
        if (jwtFallback.valid) {
          console.log(`✅ Final JWT fallback successful for ${pathname}`);
          return {
            data: { user: jwtFallback.user || null },
            error: null
          };
        }
        
        throw new Error(`Auth failed after ${MAX_AUTH_RETRIES} attempts and ${totalDuration}ms for ${pathname}`);
      }
      
      // Record retry for metrics
      authMetrics.retryCount++;
      
      // Smart delay based on error type
      const delay = errorType === 'network' ? retryDelays[0] : retryDelays[attempt] || 1000;
      if (delay > 0) {
        console.log(`⏳ Waiting ${delay}ms before retry (error: ${errorType})...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        totalDuration += delay;
      }
      
      // For network errors, trigger circuit breaker faster
      if (errorType === 'network') {
        authCircuitBreaker.recordFailure(true);
      }
      
      attempt++;
    }
  }
  
  throw new Error(`Auth failed after ${MAX_AUTH_RETRIES} attempts for ${pathname}`);
}

// Enhanced error categorization untuk better handling
function getErrorType(error: Error): string {
  const message = error.message.toLowerCase();
  const errorString = String(error).toLowerCase();
  const stack = error.stack?.toLowerCase() || '';
  
  // Comprehensive timeout detection
  if (message.includes('timeout') || 
      message.includes('aborted') || 
      message.includes('timed out') ||
      message.includes('deadline exceeded')) {
    return 'timeout';
  }
  
  // Comprehensive network error detection for "fetch failed" and variants
  if (message.includes('fetch failed') || 
      message.includes('failed to fetch') ||
      message.includes('network error') || 
      message.includes('network') || 
      message.includes('fetch') ||
      message.includes('enotfound') ||
      message.includes('econnreset') ||
      message.includes('econnrefused') ||
      message.includes('econnaborted') ||
      message.includes('dns lookup') ||
      message.includes('connection refused') ||
      message.includes('connection reset') ||
      message.includes('connection aborted') ||
      message.includes('service unavailable') ||
      message.includes('bad gateway') ||
      message.includes('gateway timeout') ||
      message.includes('network is unreachable') ||
      message.includes('no route to host') ||
      message.includes('connection timed out') ||
      errorString.includes('fetch failed') ||
      errorString.includes('failed to fetch') ||
      stack.includes('fetch failed') ||
      stack.includes('network error')) {
    return 'network';
  }
  
  // Database specific errors
  if (message.includes('database') || 
      message.includes('connection') || 
      message.includes('pool') ||
      message.includes('postgres') ||
      message.includes('supabase')) {
    return 'database';
  }
  
  // Auth specific errors
  if (message.includes('auth') || 
      message.includes('unauthorized') || 
      message.includes('forbidden') ||
      message.includes('invalid token') ||
      message.includes('expired')) {
    return 'auth';
  }
  
  // Circuit breaker errors
  if (message.includes('circuit breaker') || 
      message.includes('circuit') ||
      message.includes('breaker')) {
    return 'circuit_breaker';
  }
  
  return 'unknown';
}

// Safe redirect helper untuk mencegah stream errors
function safeRedirect(url: string, errorContext?: string) {
  try {
    return NextResponse.redirect(url);
  } catch (error) {
          console.error('❌ Redirect error:', { error: (error as Error).message, context: errorContext, url });
    
    // Fallback response
    return new NextResponse(
      JSON.stringify({ 
        error: 'Redirect failed', 
        redirectTo: url,
        context: errorContext 
      }),
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

// Main middleware function dengan optimized logging
export async function middleware(request: NextRequest) {
  const startTime = Date.now();
  
  // Update metrics
  authMetrics.totalRequests++;
  
  try {
    // Skip API Gateway routes for now (Edge Runtime compatibility)
    if (request.nextUrl.pathname.startsWith('/api/gateway/')) {
      return NextResponse.next();
    }
    
    // Handle protected routes - require authentication
    if (request.nextUrl.pathname.startsWith('/dashboard') || request.nextUrl.pathname.startsWith('/employee') || request.nextUrl.pathname.startsWith('/configuration') || request.nextUrl.pathname.startsWith('/salary') || request.nextUrl.pathname.startsWith('/permission') || request.nextUrl.pathname.startsWith('/leave')) {
      try {
        const res = NextResponse.next();
        const supabase = createMiddlewareSupabaseClient(request, res);

        // Use enhanced auth check dengan circuit breaker
        const userResult = await enhancedAuthCheck(
          () => supabase.auth.getUser(),
          request.nextUrl.pathname,
          request
        );
        const { data: { user }, error } = userResult;
        
        // Log performance metrics
        const authDuration = Date.now() - startTime;
        authMetrics.responseTimes.push(authDuration);
        
        if (authDuration > 3000) { // Warning untuk > 3 detik
          console.warn(`⚠️ Slow auth check: ${authDuration}ms for ${request.nextUrl.pathname}`);
        }
        
        // Log metrics periodically
        logPerformanceMetrics();
        cleanupOldMetrics();
        
        // Jika tidak ada user atau error
        if (error || !user) {
          console.log(`🔐 Auth failed for ${request.nextUrl.pathname}:`, {
            error: error?.message || 'No user found',
            duration: authDuration
          });
          const loginUrl = new URL('/login', request.url);
          loginUrl.searchParams.set('redirect_to', request.nextUrl.pathname);
          return safeRedirect(loginUrl.toString(), 'auth_failed');
        }
        
        authMetrics.successfulAuthentications++;
        return res;
        
      } catch (error) {
        const authDuration = Date.now() - startTime;
        const errorType = getErrorType(error as Error);
        
        authMetrics.failedAuthentications++;
        authMetrics.responseTimes.push(authDuration);
        
        console.error(`❌ Middleware auth error after ${authDuration}ms for ${request.nextUrl.pathname}:`, {
          error: (error as Error).message,
          type: errorType,
          duration: authDuration,
          stack: (error as Error).stack?.split('\n')[0] // First line of stack for debugging
        });
        
        // Final attempt with JWT fallback for ANY error
        console.log(`🔍 Final JWT fallback attempt for ${request.nextUrl.pathname}...`);
        const fallbackResult = checkJWTFallback(request);
        if (fallbackResult.valid) {
          console.log(`✅ Final JWT fallback successful for protected route ${request.nextUrl.pathname}`);
          return NextResponse.next();
        }
        
        // Redirect ke login dengan error context
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect_to', request.nextUrl.pathname);
        loginUrl.searchParams.set('error', errorType);
        loginUrl.searchParams.set('message', encodeURIComponent((error as Error).message));
        return safeRedirect(loginUrl.toString(), 'middleware_error');
      }
    }
    
    // Handle auth routes - redirect if already logged in
    if (request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/register') || request.nextUrl.pathname.startsWith('/signup')) {
      try {
        const res = NextResponse.next();
        const supabase = createMiddlewareSupabaseClient(request, res);
        
        // Quick user check untuk redirect dengan fast auth - timeout lebih pendek untuk auth pages
        const userResult = await withTimeout(
          supabase.auth.getUser(),
          FAST_AUTH_TIMEOUT, // 2 detik timeout untuk auth pages
          request.nextUrl.pathname,
          1
        );
        const { data: { user } } = userResult;
        
        if (user) {
          // Redirect ke dashboard jika sudah login
          const redirectTo = request.nextUrl.searchParams.get('redirect_to') || '/dashboard';
          const redirectUrl = new URL(redirectTo, request.url);
          return safeRedirect(redirectUrl.toString(), 'already_authenticated');
        }
        
        return res;
      } catch (error) {
        const errorType = getErrorType(error as Error);
        
        // For network errors on auth pages, try JWT fallback
        if (errorType === 'network') {
          console.log(`🌐 Network error on auth page ${request.nextUrl.pathname}, trying JWT fallback...`);
          const fallbackResult = checkJWTFallback(request);
          if (fallbackResult.valid) {
            console.log(`✅ JWT fallback successful on auth page, redirecting to dashboard`);
            const redirectTo = request.nextUrl.searchParams.get('redirect_to') || '/dashboard';
            const redirectUrl = new URL(redirectTo, request.url);
            return safeRedirect(redirectUrl.toString(), 'jwt_fallback_success');
          }
        }
        
        // Continue to auth page if error - log but don't block
        console.log(`ℹ️ Auth check failed for ${request.nextUrl.pathname}, continuing to auth page:`, {
          error: (error as Error).message,
          type: errorType
        });
        return NextResponse.next();
      }
    }
    
    // Default behavior untuk routes lainnya
    return NextResponse.next();
    
  } catch (error) {
    authMetrics.failedAuthentications++;
    
    const duration = Date.now() - startTime;
    authMetrics.responseTimes.push(duration);
    
    console.error('❌ Middleware Error:', {
      path: request.nextUrl.pathname,
      error: error instanceof Error ? error.message : String(error),
      duration: `${duration}ms`
    });
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Configuration
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public|file.svg|globe.svg|window.svg|.*\\.png$|.*\\.svg$).*)',
  ],
};

// Cleanup interval untuk mencegah memory leak (only in Node.js runtime)
if (typeof window === 'undefined' && typeof setInterval !== 'undefined') {
  try {
    setInterval(() => {
      cleanupOldMetrics();
    }, 300000); // Every 5 minutes
  } catch {
    // Silently fail in Edge Runtime - circuit breaker akan handle cleanup
  }
} 