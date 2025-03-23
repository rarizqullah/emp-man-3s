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

// Fungsi utilitas untuk autentikasi

/**
 * Login pengguna dengan email dan password
 */
export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  return { data, error };
}

/**
 * Mendaftarkan pengguna baru dengan email dan password
 */
export async function signUpWithEmail(email: string, password: string, metadata?: { name: string, role: string }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
    },
  });

  return { data, error };
}

/**
 * Logout pengguna
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

/**
 * Mendapatkan sesi pengguna saat ini
 */
export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();
  return { session: data.session, error };
}

/**
 * Mendapatkan user saat ini
 */
export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  return { user: data.user, error };
}

/**
 * Function untuk mengecek apakah pengguna sudah terotentikasi pada middleware
 */
export async function isAuthenticated(authorizationHeader: string | null) {
  // Jika header tidak ada, pengguna tidak terotentikasi
  if (!authorizationHeader) {
    return { isAuthenticated: false, user: null };
  }

  try {
    // Parse bearer token
    const token = authorizationHeader.replace('Bearer ', '');
    
    // Verifikasi JWT token melalui Supabase
    const { data, error } = await supabase.auth.getUser(token);
    
    if (error || !data.user) {
      return { isAuthenticated: false, user: null };
    }
    
    return { isAuthenticated: true, user: data.user };
  } catch (error) {
    console.error('Error verifikasi token Supabase:', error);
    return { isAuthenticated: false, user: null };
  }
} 