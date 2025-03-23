import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Pastikan rute ini selalu diproses secara dinamis
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  
  console.log('[Auth/Callback] Mengolah kode auth:', code ? 'Ditemukan' : 'Tidak ditemukan');

  if (!code) {
    console.error('[Auth/Callback] Tidak ada kode auth yang ditemukan');
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    // Buat response untuk mengatur cookies
    const res = NextResponse.redirect(new URL('/dashboard', request.url));

    // Buat Supabase client dengan pendekatan baru
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name) {
            // Ambil cookies dari request
            return request.cookies.get(name)?.value;
          },
          set(name, value, options) {
            // Atur cookies pada response
            res.cookies.set({
              name,
              value,
              ...options,
              path: options.path ?? '/',
            });
          },
          remove(name, options) {
            // Hapus cookies dari response
            res.cookies.set({
              name,
              value: '',
              ...options,
              path: options.path ?? '/',
              maxAge: 0,
            });
          },
        },
      }
    );
    
    // Proses callback dengan kode auth
    console.log('[Auth/Callback] Memproses kode auth');
    const { error } = await supabase.auth.exchangeCodeForSession(code);
      
    if (error) {
      console.error('[Auth/Callback] Error saat menukar kode auth:', error.message);
      return NextResponse.redirect(new URL('/auth-fallback?error=exchange_error', request.url));
    }
      
    console.log('[Auth/Callback] Kode auth berhasil ditukar dengan sesi');
    
    // Redirect ke dashboard setelah auth berhasil
    return res;
  } catch (error) {
    console.error('[Auth/Callback] Error saat memproses kode auth:', error);
    return NextResponse.redirect(new URL('/auth-fallback', request.url));
  }
} 