'use client';

import { createBrowserClient } from '@supabase/ssr';

let supabaseInstance: ReturnType<typeof createBrowserClient> | null = null;

// Buat klien Supabase untuk browser dengan caching
export function createClient() {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  supabaseInstance = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  return supabaseInstance;
}

// Inisialisasi klien saat kode dimuat
export const supabase = createClient();

// Fungsi helper untuk memeriksa sesi saat ini
export const checkSession = async () => {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('[Supabase] Error saat memeriksa sesi:', error.message);
      return { user: null, error };
    }
    
    if (data.session) {
      console.log('[Supabase] Sesi ditemukan untuk user:', data.session.user.email);
      return { user: data.session.user, error: null };
    } else {
      console.log('[Supabase] Tidak ada sesi aktif');
      return { user: null, error: null };
    }
  } catch (err) {
    console.error('[Supabase] Error saat memeriksa sesi:', err);
    return { user: null, error: err };
  }
}; 