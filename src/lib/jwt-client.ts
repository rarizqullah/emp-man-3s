import { jwtVerify, SignJWT } from 'jose';
import { NextRequest } from 'next/server';

// JWT Secret - idealnya disimpan di env variables
const JWT_SECRET = process.env.JWT_SECRET || 'rahasia-jwt-untuk-aplikasi';

// Konversi string ke Uint8Array untuk jose
const getSecretKey = () => new TextEncoder().encode(JWT_SECRET);

export type JWTPayload = {
  userId: string;
  email: string;
  role?: string;
  iat?: number;
  exp?: number;
};

// Fungsi untuk membuat JWT baru
export async function createToken(payload: JWTPayload): Promise<string> {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 60 * 60 * 24 * 7; // 7 hari dalam detik
  
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(iat)
    .setExpirationTime(exp)
    .sign(getSecretKey());
}

// Fungsi untuk memverifikasi dan mendekode JWT
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as JWTPayload;
  } catch (error) {
    console.error('Error verifying token:', error);
    return null;
  }
}

// Fungsi untuk mengambil token dari berbagai sumber (cookie, header)
export function getTokenFromRequest(request: NextRequest): string | null {
  // Cek dari cookie
  const tokenFromCookie = request.cookies.get('token')?.value;
  if (tokenFromCookie) return tokenFromCookie;
  
  // Cek dari header Authorization
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.replace('Bearer ', '');
  }
  
  return null;
} 