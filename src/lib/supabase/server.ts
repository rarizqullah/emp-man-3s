import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from './admin';
import { getSupabaseConfig } from './config';
import { classifySupabaseError } from './error-handler';

/**
 * Validate environment configuration on server startup
 */
const validateEnvironment = () => {
  const config = getSupabaseConfig();
  if (!config.isValid) {
    console.error('❌ Supabase configuration errors:', config.errors);
    // Don't throw in production to prevent app crashes
    if (process.env.NODE_ENV !== 'production') {
      throw new Error(`Supabase configuration invalid: ${config.errors.join(', ')}`);
    }
  }
  return config;
};

// Validate on module load
const CONFIG = validateEnvironment();

/**
 * Client Supabase untuk komponen Server dengan enhanced error handling
 * Gunakan ini dalam Server Components dan Server Actions
 */
export const createServerSupabaseClient = async () => {
  try {
    if (!CONFIG.isValid) {
      throw new Error('Invalid Supabase configuration');
    }
    
    const cookieStore = await cookies();
    
    return createServerClient(
      CONFIG.url,
      CONFIG.anonKey,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value, ...options });
            } catch (error) {
              console.error('❌ Error setting cookie in server component:', error);
            }
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value: '', ...options });
            } catch (error) {
              console.error('❌ Error removing cookie in server component:', error);
            }
          },
        },
      }
    );
  } catch (error) {
    const errorInfo = classifySupabaseError(error);
    console.error('❌ Error creating server Supabase client:', {
      type: errorInfo.type,
      message: errorInfo.message
    });
    throw error;
  }
};

/**
 * Alias for createServerSupabaseClient for backward compatibility
 */
export const supabaseServerComponent = createServerSupabaseClient;

/**
 * Client Supabase untuk Route Handlers dengan enhanced error handling
 * Gunakan ini dalam API Routes/Route Handlers
 */
export const supabaseRouteHandler = async (request?: Request) => {
  try {
    if (!CONFIG.isValid) {
      throw new Error('Invalid Supabase configuration');
    }
    
    if (request) {
      // Jika ada request, gunakan cookies dari request headers
      const cookieStore = request.headers.get('cookie') || '';
      
      return createServerClient(
        CONFIG.url,
        CONFIG.anonKey,
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
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            set(name: string, _value: string, _options: CookieOptions) {
              // Cannot set cookies in this context, but we can read them
              console.warn(`Cannot set cookie ${name} in route handler without response`);
            },
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    const errorInfo = classifySupabaseError(error);
    console.error('❌ Error creating Supabase client for route handler:', {
      type: errorInfo.type,
      message: errorInfo.message
    });
    throw error;
  }
};

/**
 * Helper function untuk mengumpulkan chunked cookies - optimized
 */
const getChunkedCookie = (req: NextRequest, name: string): string | undefined => {
  // Coba ambil cookie utama dulu
  const mainCookie = req.cookies.get(name)?.value;
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
 * Client Supabase untuk Middleware dengan enhanced error handling dan cookie handling
 * Gunakan ini dalam middleware.ts
 */
export const createMiddlewareSupabaseClient = (
  req: NextRequest,
  res: NextResponse
) => {
  try {
    if (!CONFIG.isValid) {
      throw new Error('Invalid Supabase configuration');
    }
    
    return createServerClient(
      CONFIG.url,
      CONFIG.anonKey,
      {
        cookies: {
          get(name: string) {
            // Enhanced cookie retrieval dengan chunked support
            return getChunkedCookie(req, name);
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
              console.error('❌ Error setting cookie in middleware:', error);
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
                ...options,
              });
              
              // Remove chunked cookies
              for (let i = 0; i < 10; i++) {
                res.cookies.set({
                  name: `${name}.${i}`,
                  value: '',
                  maxAge: 0,
                  path: '/',
                  ...options,
                });
              }
            } catch (error) {
              console.error('❌ Error removing cookie in middleware:', error);
            }
          },
        },
      }
    );
  } catch (error) {
    const errorInfo = classifySupabaseError(error);
    console.error('❌ Error creating middleware Supabase client:', {
      type: errorInfo.type,
      message: errorInfo.message
    });
    throw error;
  }
};

// Menghapus duplicate supabaseAdmin function, karena sudah diimport dari admin.ts
// dan mengekspor ulang untuk mempertahankan API
export { supabaseAdmin }; 