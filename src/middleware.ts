import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

// Daftar path yang tidak perlu autentikasi
const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/forgot-password',
  '/api/auth',
  '/auth-fallback',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/session',
  '/api/auth/csrf',
  '/api/auth/callback',
  '/api/auth/signin',
  '/api/auth/signout',
  '/api/auth/providers',
  '/api/auth/callback',
  '/api/auth/verify-request',
  '/api/auth/error',
  '/api/auth/token',
  '/api/auth/refresh',
  '/_next/static',
  '/_next/image',
  '/favicon.ico',
];

// Middleware ini akan berjalan sebelum request sampai ke route handler
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  console.log('[Middleware] Processing request for:', pathname);

  // Izinkan semua request ke _next, static, dll
  if (pathname.startsWith('/_next') || 
      pathname.startsWith('/static') ||
      pathname.startsWith('/.well-known') ||
      pathname === '/favicon.ico' ||
      pathname === '/robots.txt') {
    return NextResponse.next();
  }

  // Izinkan path publik
  const isPublicPath = PUBLIC_PATHS.some(path => 
    pathname === path || pathname.startsWith(`${path}/`)
  );
  if (isPublicPath) {
    console.log('[Middleware] Path publik diizinkan:', pathname);
    return NextResponse.next();
  }

  try {
    // Gunakan getToken dari NextAuth untuk verifikasi
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    });
    
    console.log('[Middleware] Token NextAuth:', token ? 'ditemukan' : 'tidak ditemukan');
    
    if (token) {
      return NextResponse.next();
    }
    
    // Jika API request dan tidak ada token yang valid, kembalikan 401
    if (pathname.startsWith('/api/')) {
      console.log('[Middleware] API request tanpa token valid, mengembalikan 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Redirect ke login
    console.log('[Middleware] Token tidak ditemukan, mengalihkan ke login:', pathname);
    return NextResponse.redirect(new URL('/login', request.url));
  } catch (error) {
    console.error('[Middleware] Error middleware:', error);
    
    // Dalam kasus error, lebih aman untuk memungkinkan permintaan dilanjutkan
    // daripada memblokir pengguna dan menyebabkan loop redirect
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
    
    return NextResponse.redirect(new URL('/auth-fallback', request.url));
  }
}

// Konfigurasi path yang perlu middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * 1. /_next (Next.js internals)
     * 2. /static (static files)
     * 3. /.well-known (special files)
     * 4. /favicon.ico, /robots.txt (common files)
     */
    '/((?!_next|static|.well-known|favicon.ico|robots.txt).*)',
  ],
}; 