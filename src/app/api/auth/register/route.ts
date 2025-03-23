import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { syncUserWithDatabase } from '@/lib/user-service';

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, role = 'EMPLOYEE' } = await req.json();

    // Validasi input
    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Email, password, dan nama diperlukan' }, { status: 400 });
    }

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

    // Daftarkan user di Supabase
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role,
        },
      },
    });

    if (error) {
      console.error('Error registrasi Supabase:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data.user) {
      return NextResponse.json({ error: 'Gagal membuat user' }, { status: 500 });
    }

    // Sinkronisasi user ke database lokal
    try {
      await syncUserWithDatabase(data.user);
    } catch (syncError) {
      console.error('Error sinkronisasi user ke database lokal:', syncError);
      // Tidak perlu mengembalikan error ke client, karena user sudah terdaftar di Supabase
    }

    return NextResponse.json({ 
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
      },
      message: 'Pendaftaran berhasil. Silakan cek email Anda untuk verifikasi.' 
    });
  } catch (error) {
    console.error('Error registrasi:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Terjadi kesalahan saat mendaftar' 
    }, { status: 500 });
  }
} 