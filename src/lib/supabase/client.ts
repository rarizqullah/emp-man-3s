'use client';

import { createClient } from '@supabase/supabase-js';

// Periksa apakah variabel lingkungan tersedia
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.error('NEXT_PUBLIC_SUPABASE_URL tidak tersedia dalam variabel lingkungan');
}

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY tidak tersedia dalam variabel lingkungan');
}

// Pastikan URL dan ANON_KEY diambil dari env sesuai dengan .env
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL atau ANON KEY tidak ditemukan. Pastikan variabel lingkungan terisi dengan benar.');
}

// Buat dan ekspor klien Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storageKey: 'supabase.auth.token',
    autoRefreshToken: true,
    detectSessionInUrl: true,
  }
}); 