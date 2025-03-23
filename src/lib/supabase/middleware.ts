import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  // 1. Periksa apakah ini adalah halaman yang tidak memerlukan autentikasi
  const { pathname } = request.nextUrl;
  
  // Daftar path yang selalu diizinkan tanpa auth check
  if (
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/forgot-password' ||
    pathname === '/auth/callback' ||
    pathname.startsWith('/_next') || 
    pathname.startsWith('/static') ||
    pathname.startsWith('/.well-known') ||
    pathname === '/favicon.ico' || 
    pathname === '/robots.txt' ||
    pathname.startsWith('/api/auth/') ||
    pathname === '/auth-fallback'
  ) {
    return NextResponse.next();
  }

  // 2. Siapkan response untuk cookies
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // 3. Buat client Supabase
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value;
        },
        set(name, value, options) {
          response.cookies.set({
            name,
            value,
            ...options,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
          });
        },
        remove(name, options) {
          response.cookies.set({
            name,
            value: '',
            ...options,
            maxAge: 0,
          });
        },
      },
    }
  );

  // 4. Memeriksa user yang terautentikasi
  const { data: { user } } = await supabase.auth.getUser();

  // 5. Tangani redirect berdasarkan status autentikasi
  if (user) {
    // User sudah login - izinkan ke dashboard
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    
    // Izinkan akses ke halaman terproteksi lainnya
    return response;
  } else {
    // User belum login
    
    // API route yang membutuhkan autentikasi
    if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Redirect ke login jika bukan halaman publik
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    
    // Mencoba mengakses halaman terproteksi, redirect ke login
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/(dashboard)')) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    
    return NextResponse.redirect(new URL('/login', request.url));
  }
} 