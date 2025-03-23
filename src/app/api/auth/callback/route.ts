import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  const requestUrl = new URL(req.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    // Buat Supabase client 
    const supabase = createRouteHandlerClient({ cookies });
    
    // Tukar code dengan session
    await supabase.auth.exchangeCodeForSession(code);
    
    // Redirect ke dashboard setelah login berhasil
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Jika tidak ada kode, tampilkan pesan error
  return NextResponse.redirect(new URL('/login?error=callback_error', req.url));
} 