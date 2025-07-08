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
 * Client Supabase untuk Route Handlers dengan request-aware cookies
 * Gunakan ini dalam API Routes/Route Handlers
 */
export const supabaseRouteHandler = async (request?: Request) => {
  try {
    if (request) {
      // Jika ada request, gunakan cookies dari request headers
      const cookieStore = request.headers.get('cookie') || '';
      
      return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              // Parse cookies from header string
              const cookies = cookieStore.split(';').reduce((acc, cookie) => {
                const [key, value] = cookie.trim().split('=');
                if (key && value) {
                  acc[key] = decodeURIComponent(value);
                }
                return acc;
              }, {} as Record<string, string>);
              
              return cookies[name];
            },
            set(name: string, value: string, options: CookieOptions) {
              // Cannot set cookies in this context, but we can read them
              console.warn(`Cannot set cookie ${name} in route handler without response`);
            },
            remove(name: string, options: CookieOptions) {
              // Cannot remove cookies in this context
              console.warn(`Cannot remove cookie ${name} in route handler without response`);
            },
          },
        }
      );
    } else {
      // Fallback ke method lama jika tidak ada request
      return await createServerSupabaseClient();
    }
  } catch (error) {
    console.error('Error creating Supabase client for route handler:', error);
    throw error;
  }
};

/**
 * Helper function untuk mengumpulkan chunked cookies - optimized
 */
const getChunkedCookie = (req: NextRequest, name: string): string | undefined => {
  // Coba ambil cookie utama dulu
  let mainCookie = req.cookies.get(name)?.value;
  if (mainCookie) {
    return mainCookie;
  }

  // Jika tidak ada, coba ambil chunked cookies
  const chunks: string[] = [];
  let index = 0;
  
  while (true) {
    const chunkName = `${name}.${index}`;
    const chunk = req.cookies.get(chunkName)?.value;
    
    if (!chunk) {
      break;
    }
    
    chunks.push(chunk);
    index++;
  }
  
  if (chunks.length > 0) {
    const combinedValue = chunks.join('');
    return combinedValue;
  }
  
  return undefined;
};

/**
 * Client Supabase untuk Middleware dengan enhanced cookie handling - optimized
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
          // Enhanced cookie retrieval dengan chunked support - tanpa logging berlebihan
          const value = getChunkedCookie(req, name);
          return value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            // Handle large cookies dengan chunking
            const maxCookieSize = 3800; // Browser limit ~4KB
            
            if (value.length > maxCookieSize) {
              // Split into chunks
              const chunks = Math.ceil(value.length / maxCookieSize);
              
              for (let i = 0; i < chunks; i++) {
                const start = i * maxCookieSize;
                const end = Math.min(start + maxCookieSize, value.length);
                const chunk = value.substring(start, end);
                
                res.cookies.set({
                  name: `${name}.${i}`,
                  value: chunk,
                  ...options,
                  httpOnly: false, // Supabase needs to access auth cookies
                  secure: process.env.NODE_ENV === 'production',
                  sameSite: 'lax',
                  path: '/',
                  maxAge: 100 * 365 * 24 * 60 * 60, // 100 years
                });
              }
              
              // Remove main cookie if it exists
              res.cookies.set({
                name,
                value: '',
                maxAge: 0,
                path: '/',
              });
            } else {
              // Normal cookie
              res.cookies.set({
                name,
                value,
                ...options,
                httpOnly: false, // Supabase needs to access auth cookies
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
                maxAge: 100 * 365 * 24 * 60 * 60, // 100 years
              });
            }
          } catch (error) {
            console.error('❌ Error setting cookie:', error);
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            // Remove main cookie
            res.cookies.set({
              name,
              value: '',
              maxAge: 0,
              path: '/',
            });
            
            // Remove chunked cookies
            for (let i = 0; i < 10; i++) {
              res.cookies.set({
                name: `${name}.${i}`,
                value: '',
                maxAge: 0,
                path: '/',
              });
            }
          } catch (error) {
            console.error('❌ Error removing cookie:', error);
          }
        },
      },
    }
  );
};

// Menghapus duplicate supabaseAdmin function, karena sudah diimport dari admin.ts
// dan mengekspor ulang untuk mempertahankan API
export { supabaseAdmin }; 