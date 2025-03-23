import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  
  console.log('[Auth/Callback] Mengolah kode auth:', code ? 'Ditemukan' : 'Tidak ditemukan');

  if (code) {
    try {
      const cookieStore = cookies();
      // Buat Supabase client dengan cookieStore
      const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
      
      // Proses callback dengan kode auth
      console.log('[Auth/Callback] Memproses kode auth');
      await supabase.auth.exchangeCodeForSession(code);
      console.log('[Auth/Callback] Kode auth berhasil ditukar dengan sesi');
    } catch (error) {
      console.error('[Auth/Callback] Error saat memproses kode auth:', error);
      return NextResponse.redirect(new URL('/auth-fallback', request.url));
    }
  } else {
    console.error('[Auth/Callback] Tidak ada kode auth yang ditemukan');
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // URL untuk redirect setelah auth
  console.log('[Auth/Callback] Mengalihkan ke dashboard');
  return NextResponse.redirect(new URL('/dashboard', request.url));
} 