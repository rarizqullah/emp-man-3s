import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

// Middleware ini akan berjalan sebelum request sampai ke route handler
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  console.log(`[Middleware] Memproses request untuk: ${pathname}`);
  
  // Daftar path yang tidak memerlukan autentikasi
  const publicPaths = [
    '/login',
    '/register',
    '/forgot-password',
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/session',
    '/api/auth/csrf',
    '/api/auth/callback',
    '/api/auth/signin',
    '/api/auth/signout',
    '/api/auth/providers',
    '/api/auth/verify-request',
    '/api/auth/error',
    '/api/auth/token',
    '/api/auth/refresh',
    '/api/auth/_log',
  ];

  // Izinkan semua request ke _next, static, dll
  if (
    pathname.startsWith('/_next') || 
    pathname.startsWith('/static') ||
    pathname.startsWith('/.well-known') ||
    pathname === '/favicon.ico' || 
    pathname === '/robots.txt' ||
    pathname.startsWith('/api/auth/')
  ) {
    console.log(`[Middleware] Static atau Auth API, diizinkan: ${pathname}`);
    return NextResponse.next();
  }

  // Izinkan path publik yang terdaftar
  const isPublicPath = publicPaths.some(path => pathname === path);
  if (isPublicPath) {
    console.log(`[Middleware] Path publik diizinkan: ${pathname}`);
    return NextResponse.next();
  }

  try {
    // Gunakan getToken dari NextAuth untuk verifikasi
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    });
    
    console.log(`[Middleware] Token NextAuth: ${token ? 'ditemukan' : 'tidak ditemukan'}`);
    
    if (token) {
      // Jika pengguna terautentikasi dan mencoba mengakses halaman login, redirect ke dashboard
      if (pathname === '/login') {
        console.log(`[Middleware] User sudah terautentikasi, redirect dari login ke dashboard`);
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
      
      return NextResponse.next();
    }
    
    // Jika API request dan tidak ada token yang valid, kembalikan 401
    if (pathname.startsWith('/api/')) {
      console.log(`[Middleware] API request tanpa token valid, mengembalikan 401: ${pathname}`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Redirect ke login
    console.log(`[Middleware] Token tidak ditemukan, mengalihkan ke login: ${pathname}`);
    
    // Tambahkan parameter redirect_to jika bukan halaman login
    const url = new URL('/login', request.url);
    if (pathname !== '/login' && !pathname.startsWith('/api/')) {
      url.searchParams.set('redirect_to', pathname);
    }
    
    return NextResponse.redirect(url);
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
    // Lindungi semua route kecuali yang tercantum
    '/((?!_next|static|.well-known|favicon.ico|robots.txt).*)',
  ],
}; 