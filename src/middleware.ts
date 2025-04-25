import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // Refresh session jika diperlukan
  await supabase.auth.getSession();

  return res;
}

export const config = {
  matcher: [
    // Exclude files with extensions and api routes
    '/((?!_next/static|_next/image|favicon.ico|images|api/auth).*)',
  ],
}; 