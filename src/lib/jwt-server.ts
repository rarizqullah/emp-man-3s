import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { JWTPayload } from './jwt-client';

// Set token ke cookies (server-side only)
export async function setTokenCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7, // 7 hari dalam detik
    path: '/',
    sameSite: 'lax',
  });
}

// Hapus token dari cookies (server-side only)
export async function removeTokenCookie() {
  const cookieStore = await cookies();
  cookieStore.delete('token');
}

// Middleware helper untuk mengecek dan memproses JWT
export function authorizeRequest(request: NextRequest, payload: JWTPayload) {
  // Tambahkan data user ke request header untuk diakses oleh komponen berikutnya
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', payload.userId);
  requestHeaders.set('x-user-email', payload.email);
  if (payload.role) {
    requestHeaders.set('x-user-role', payload.role);
  }
  
  // Kembalikan request yang sudah dimodifikasi
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
} 