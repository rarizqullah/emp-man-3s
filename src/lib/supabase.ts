import { createClient } from '@supabase/supabase-js';

// PENTING: Ganti nilai berikut dengan kredensial Supabase Anda yang sebenarnya
// dan buatlah file .env.local di root proyek dengan nilai yang sama
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-supabase-url.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-supabase-anon-key';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Daftar rute yang dapat diakses tanpa autentikasi
export const publicRoutes = [
  '/login',
  '/register',
  '/forgot-password',
  '/',
];

// Asset dan API yang diperbolehkan tanpa autentikasi
export const allowedPaths = [
  '/_next',
  '/static',
  '/.well-known',
  '/favicon.ico', 
  '/robots.txt',
  '/images/',
  '/fonts/',
  '/logo.png',
  '/api/auth/register',
  '/api/auth/login',
]; 