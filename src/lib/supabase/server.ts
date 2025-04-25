import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from './admin';

/**
 * Client Supabase untuk komponen Server
 * Gunakan ini dalam Server Components dan Server Actions
 */
export const createServerSupabaseClient = async () => {
  const cookieStore = await cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );
};

/**
 * Alias for createServerSupabaseClient for backward compatibility
 */
export const supabaseServerComponent = createServerSupabaseClient;

/**
 * Client Supabase untuk Route Handlers
 * Gunakan ini dalam API Routes/Route Handlers
 */
export const supabaseRouteHandler = async () => {
  try {
    return await createServerSupabaseClient();
  } catch (error) {
    console.error('Error creating Supabase client for route handler:', error);
    throw error;
  }
};

/**
 * Client Supabase untuk Middleware
 * Gunakan ini dalam middleware.ts
 */
export const createMiddlewareSupabaseClient = (
  req: NextRequest,
  res: NextResponse
) => {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          res.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          res.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );
};

// Menghapus duplicate supabaseAdmin function, karena sudah diimport dari admin.ts
// dan mengekspor ulang untuk mempertahankan API
export { supabaseAdmin }; 