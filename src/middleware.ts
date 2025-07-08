import { createMiddlewareSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { suppressStreamErrors } from '@/lib/utils/stream-handler';


// JWT fallback untuk network failures
interface JWTPayload {
  sub: string;
  email?: string;
  exp?: number;
  iat?: number;
}

// Initialize stream error suppression untuk development
suppressStreamErrors();

// Enhanced timeout configuration - lebih realistis
const AUTH_TIMEOUT = 30000; // 30 detik - lebih generous untuk koneksi lambat
const RETRY_ATTEMPTS = 3; // Tambah jadi 3 attempts
const MAX_BACKOFF = 5000; // Max 5 detik backoff
const MAX_NETWORK_RETRIES = 2; // Extra retries untuk network errors

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
  if (process.env.NODE_ENV === 'production') return;
  
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
  let mainCookie = req.cookies.get(name)?.value;
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

// JWT fallback auth check
function checkJWTFallback(req: NextRequest): { valid: boolean; user?: any } {
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

// Enhanced timeout helper dengan better error detection
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Auth timeout after ${timeoutMs}ms for ${operation}`));
      }, timeoutMs);
      
      // Cleanup timeout if promise resolves
      promise.finally(() => clearTimeout(timeoutId));
    })
  ]);
}

// Enhanced retry mechanism dengan progressive backoff dan network fallback
async function retryAuthCheck(
  authFunction: () => Promise<any>, 
  pathname: string,
  req: NextRequest,
  maxAttempts: number = RETRY_ATTEMPTS
): Promise<any> {
  let lastError: Error | null = null;
  const startTime = Date.now();
  let networkRetryCount = 0;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const operationName = `${pathname} (attempt ${attempt})`;
      const result = await withTimeout(authFunction(), AUTH_TIMEOUT, operationName);
      
      // Log successful auth after retry
      if (attempt > 1) {
        authMetrics.retryCount++;
        console.log(`✅ Auth succeeded on attempt ${attempt} for ${pathname}`);
      }
      
      // Update metrics
      const duration = Date.now() - startTime;
      authMetrics.totalRequests++;
      authMetrics.averageResponseTime = 
        (authMetrics.averageResponseTime * (authMetrics.totalRequests - 1) + duration) / authMetrics.totalRequests;
      
      return result;
    } catch (error) {
      lastError = error as Error;
      
      // Categorize error type
      const errorType = getErrorType(error as Error);
      console.warn(`⚠️ Auth attempt ${attempt}/${maxAttempts} failed for ${pathname}:`, {
        error: (error as Error).message,
        type: errorType,
        duration: Date.now() - startTime,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL
      });
      
      // Update timeout metrics
      if ((error as Error).message.includes('timeout')) {
        authMetrics.timeoutCount++;
      }
      
      // Special handling untuk network errors dengan extra retries
      if (errorType === 'network' && networkRetryCount < MAX_NETWORK_RETRIES) {
        networkRetryCount++;
        const networkBackoff = 2000 * networkRetryCount; // 2s, 4s untuk network
        
        console.log(`🌐 Network error detected, extra retry ${networkRetryCount}/${MAX_NETWORK_RETRIES} in ${networkBackoff}ms...`);
        await new Promise(resolve => setTimeout(resolve, networkBackoff));
        
        // Coba JWT fallback sebelum retry
        const fallbackResult = checkJWTFallback(req);
        if (fallbackResult.valid) {
          console.log(`🔄 Using JWT fallback for ${pathname} due to network issues`);
          return {
            data: { user: fallbackResult.user },
            error: null
          };
        }
        
        // Reset attempt counter untuk network retry
        attempt--;
        continue;
      }
      
      // Jika bukan attempt terakhir, tunggu sebelum retry
      if (attempt < maxAttempts) {
        // Progressive backoff dengan jitter untuk menghindari thundering herd
        const baseBackoff = Math.min(1000 * Math.pow(2, attempt - 1), MAX_BACKOFF);
        const jitter = Math.random() * 500; // 0-500ms random jitter
        const backoffMs = baseBackoff + jitter;
        
        console.log(`🔄 Retrying auth for ${pathname} in ${Math.round(backoffMs)}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }
  }
  
  // Final JWT fallback jika semua attempts gagal
  console.log(`🔍 All auth attempts failed for ${pathname}, trying JWT fallback...`);
  const fallbackResult = checkJWTFallback(req);
  if (fallbackResult.valid) {
    console.log(`✅ JWT fallback successful for ${pathname}`);
    authMetrics.totalRequests++;
    return {
      data: { user: fallbackResult.user },
      error: null
    };
  }
  
  // Update final metrics
  authMetrics.totalRequests++;
  
  // Jika semua attempts dan fallback gagal, throw error terakhir
  throw lastError;
}

// Error categorization untuk better handling
function getErrorType(error: Error): string {
  const message = error.message.toLowerCase();
  
  if (message.includes('timeout')) return 'timeout';
  if (message.includes('fetch failed') || 
      message.includes('network') || 
      message.includes('fetch') ||
      message.includes('enotfound') ||
      message.includes('econnreset') ||
      message.includes('econnrefused') ||
      message.includes('dns lookup')) return 'network';
  if (message.includes('database') || message.includes('connection')) return 'database';
  if (message.includes('auth')) return 'auth';
  
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

        // Use enhanced retry mechanism untuk auth check
        const userResult = await retryAuthCheck(
          () => supabase.auth.getUser(),
          request.nextUrl.pathname,
          request
        );
        const { data: { user }, error } = userResult;
        
        // Log performance metrics
        const authDuration = Date.now() - startTime;
        if (authDuration > 5000) { // Warning untuk > 5 detik
          console.warn(`⚠️ Slow auth check: ${authDuration}ms for ${request.nextUrl.pathname}`);
        }
        
        // Log metrics periodically
        logPerformanceMetrics();
        
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
        
        return res;
      } catch (error) {
        const authDuration = Date.now() - startTime;
        const errorType = getErrorType(error as Error);
        
               console.error(`❌ Middleware auth error after ${authDuration}ms for ${request.nextUrl.pathname}:`, {
           error: (error as Error).message,
           type: errorType,
           duration: authDuration
         });
        
        // Redirect ke login jika terjadi error atau timeout
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect_to', request.nextUrl.pathname);
        loginUrl.searchParams.set('error', errorType);
        return safeRedirect(loginUrl.toString(), 'middleware_error');
      }
    }
    
    // Handle auth routes - redirect if already logged in
    if (request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/register') || request.nextUrl.pathname.startsWith('/signup')) {
      try {
        const res = NextResponse.next();
        const supabase = createMiddlewareSupabaseClient(request, res);
        
        // Quick user check untuk redirect dengan retry - timeout lebih pendek untuk auth pages
        const userResult = await retryAuthCheck(
          () => supabase.auth.getUser(),
          request.nextUrl.pathname,
          request,
          2 // Hanya 2 attempts untuk auth pages
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
        // Continue to auth page if error - log but don't block
               console.log(`ℹ️ Auth check failed for ${request.nextUrl.pathname}, continuing to auth page:`, {
           error: (error as Error).message,
           type: getErrorType(error as Error)
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
  } catch (error) {
    // Silently fail in Edge Runtime
  }
} 