import { createMiddlewareSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  // Buat response baru untuk dimodifikasi header cookie-nya
  const res = NextResponse.next();
  
  // Buat client Supabase untuk middleware
  const supabase = createMiddlewareSupabaseClient(req, res);

  // Refresh session (sesuaikan dengan kebutuhan)
  await supabase.auth.getSession();

  return res;
}

export const config = {
  matcher: [
    // Exclude files with extensions and api routes
    '/((?!_next/static|_next/image|favicon.ico|images|api/auth).*)',
  ],
}; 