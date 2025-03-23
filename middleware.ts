import { NextRequest, NextResponse } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

// Counter untuk mencegah loop redirect
const redirectCache = new Map<string, number>();
const MAX_REDIRECTS = 3; // Batas maksimum redirect sebelum bypass middleware

// Middleware ini akan berjalan sebelum request sampai ke route handler
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  console.log(`[Middleware] Memproses request untuk: ${pathname}`);
  
  // Deteksi loop redirect dengan URL lengkap untuk identifikasi yang lebih tepat
  const requestKey = request.url;
  const currentRedirectCount = redirectCache.get(requestKey) || 0;
  
  // Jika terlalu banyak redirect dalam waktu singkat, bypass middleware
  if (currentRedirectCount >= MAX_REDIRECTS) {
    console.log(`[Middleware] Terlalu banyak redirect terdeteksi (${currentRedirectCount}), bypass middleware untuk: ${pathname}`);
    redirectCache.set(requestKey, 0); // Reset counter
    return NextResponse.next();
  }
  
  // Increment counter
  redirectCache.set(requestKey, currentRedirectCount + 1);
  
  // Setelah 5 detik, reset counter
  setTimeout(() => {
    if (redirectCache.has(requestKey)) {
      redirectCache.delete(requestKey);
    }
  }, 5000);
  
  // PERBAIKAN: Khusus untuk dashboard, jika terjadi redirect lebih dari sekali, bypass saja
  if (pathname === '/dashboard' && currentRedirectCount > 1) {
    console.log(`[Middleware] Dashboard redirect loop terdeteksi, bypass middleware`);
    return NextResponse.next();
  }
  
  // Daftar path yang tidak memerlukan autentikasi
  const publicPaths = [
    '/login',
    '/register',
    '/forgot-password',
    '/auth/callback',
  ];

  // Izinkan semua request ke _next, static, dll
  if (
    pathname.startsWith('/_next') || 
    pathname.startsWith('/static') ||
    pathname.startsWith('/.well-known') ||
    pathname === '/favicon.ico' || 
    pathname === '/robots.txt' ||
    pathname.startsWith('/api/auth/callback') ||
    pathname === '/auth/callback'
  ) {
    console.log(`[Middleware] Static atau Auth callback, diizinkan: ${pathname}`);
    return NextResponse.next();
  }

  // Izinkan path publik yang terdaftar
  const isPublicPath = publicPaths.some(path => pathname === path);
  
  // Cek apakah ini adalah halaman login dengan parameter redirect_to yang mengarah ke dashboard
  // Ini untuk mencegah loop redirect
  const isLoginWithRedirectLoop = pathname === '/login' && request.nextUrl.searchParams.get('redirect_to') === '/dashboard';
  
  if (isPublicPath && !isLoginWithRedirectLoop) {
    console.log(`[Middleware] Path publik diizinkan: ${pathname}`);
    return NextResponse.next();
  }
  
  // Jika terdeteksi loop redirect pada halaman login, hapus parameter redirect_to
  if (isLoginWithRedirectLoop) {
    console.log(`[Middleware] Terdeteksi potensi loop redirect, membersihkan URL`);
    const cleanUrl = new URL('/login', request.url);
    return NextResponse.redirect(cleanUrl);
  }

  try {
    // Inisialisasi Supabase client untuk middleware
    const response = NextResponse.next();
    const supabase = createMiddlewareClient({ req: request, res: response });
    
    // Dapatkan sesi dari Supabase
    const { data: { session } } = await supabase.auth.getSession();
    
    console.log(`[Middleware] Supabase session: ${session ? 'ditemukan' : 'tidak ditemukan'}`);
    
    if (session?.user) {
      // Jika pengguna terautentikasi dan mencoba mengakses halaman login, redirect ke dashboard
      if (pathname === '/login') {
        console.log(`[Middleware] User sudah terautentikasi, redirect dari login ke dashboard`);
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
      
      return response;
    }
    
    // Jika API request dan tidak ada token yang valid, kembalikan 401
    if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth/')) {
      console.log(`[Middleware] API request tanpa token valid, mengembalikan 401: ${pathname}`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Redirect ke login
    console.log(`[Middleware] Token tidak ditemukan, mengalihkan ke login: ${pathname}`);
    
    // PENTING: Jika request ke /dashboard, jangan tambahkan parameter redirect_to
    // karena ini yang menyebabkan loop redirect
    const url = new URL('/login', request.url);
    
    // Hanya tambahkan redirect_to untuk path spesifik yang benar-benar perlu redirect kembali
    // Hapus /dashboard dari daftar path yang bisa mendapat redirect_to
    if (pathname !== '/login' && 
        !pathname.startsWith('/api/') && 
        !pathname.includes('/dashboard') && 
        !pathname.includes('favicon')) {
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