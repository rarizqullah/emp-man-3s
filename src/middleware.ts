import { NextRequest, NextResponse } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

// Daftar path yang tidak perlu autentikasi
const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/auth/callback',
  '/api/auth',
  '/auth-fallback',
  '/_next/static',
  '/_next/image',
  '/favicon.ico',
];

// Middleware ini akan berjalan sebelum request sampai ke route handler
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  console.log('[Middleware] Memproses request untuk:', pathname);

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
    // Buat response yang akan kita modifikasi
    const res = NextResponse.next();
    
    // Inisialisasi Supabase client
    const supabase = createMiddlewareClient({ req: request, res });
    
    // Periksa sesi aktif
    const { data: { session } } = await supabase.auth.getSession();
    console.log('[Middleware] Status sesi:', session ? 'aktif' : 'tidak aktif');
    
    // Cek apakah kita terjebak dalam loop redirect
    const redirectCount = parseInt(request.headers.get('x-redirect-count') || '0');
    if (redirectCount > 3) {
      console.error('[Middleware] Terdeteksi loop redirect, mengarahkan ke fallback');
      return NextResponse.redirect(new URL('/auth-fallback', request.url));
    }
    
    if (session) {
      // Session ada, lanjutkan dengan response yang sudah dimodifikasi oleh Supabase
      return res;
    }
    
    // Jika API request dan tidak ada token yang valid, kembalikan 401
    if (pathname.startsWith('/api/')) {
      console.log('[Middleware] API request tanpa sesi valid, mengembalikan 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Redirect ke login dengan penghitung loop
    console.log('[Middleware] Sesi tidak ditemukan, mengalihkan ke login:', pathname);
    const redirectUrl = new URL('/login', request.url);
    const redirectRes = NextResponse.redirect(redirectUrl);
    redirectRes.headers.set('x-redirect-count', (redirectCount + 1).toString());
    return redirectRes;
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