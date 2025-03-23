import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    console.log('[API] /api/auth/sync dipanggil');
    
    // Buat Supabase client menggunakan createServerClient
    const cookieStore = await cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
        },
      }
    );
    
    // Cek session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      console.error('[API] Tidak ada sesi user aktif');
      return NextResponse.json({ error: 'Tidak ada sesi user aktif' }, { status: 401 });
    }
    
    console.log('[API] Session user terdeteksi:', session.user.email);
    
    // Kita sudah memiliki sesi yang valid, cukup kembalikan informasi user
    return NextResponse.json({ 
      success: true, 
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.user_metadata?.full_name || 'User',
        role: session.user.user_metadata?.role || 'EMPLOYEE',
      }
    });
  } catch (error) {
    console.error('[API] Error API sync user:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Gagal sinkronisasi data pengguna' 
    }, { status: 500 });
  }
} 