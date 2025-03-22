/**
 * Utilitas autentikasi JWT untuk aplikasi
 * Menyediakan fungsi-fungsi untuk verifikasi token JWT
 */

import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

// Tipe untuk data user dalam token
export interface TokenUser {
  id: string;
  email: string;
  name: string;
  role: string;
  iat: number;
  exp: number;
}

/**
 * Verifikasi token dari cookie atau header Authorization
 * @param req Request NextJS
 * @returns Data user jika token valid, null jika tidak valid
 */
export async function verifyToken(req: NextRequest): Promise<TokenUser | null> {
  try {
    // Dapatkan token dari header Authorization
    const authHeader = req.headers.get('Authorization');
    let token: string | undefined;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Jika ada di header Authorization
      token = authHeader.substring(7);
    } else {
      // Jika tidak ada di header, cek di cookie
      const tokenCookie = req.cookies.get('token');
      if (tokenCookie) {
        token = tokenCookie.value;
      }
    }
    
    if (!token) {
      return null;
    }
    
    // Ambil JWT secret dari environment variables
    const jwtSecret = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET;
    
    if (!jwtSecret) {
      console.error('JWT Secret tidak ditemukan di environment variables');
      return null;
    }
    
    // Verifikasi token
    const decoded = jwt.verify(token, jwtSecret) as TokenUser;
    
    // Pastikan token belum expired
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < now) {
      console.error('Token sudah expired');
      return null;
    }
    
    return decoded;
  } catch (error) {
    console.error('Error verifikasi token:', error);
    return null;
  }
}

/**
 * Verifikasi token dari cookie untuk digunakan di server components
 * @returns Data user jika token valid, null jika tidak valid
 */
export async function getServerSession(): Promise<TokenUser | null> {
  try {
    // Baca cookie secara langsung
    const cookieStore = cookies();
    const token = cookieStore.get('token')?.value;
    
    if (!token) {
      return null;
    }
    
    // Ambil JWT secret dari environment variables
    const jwtSecret = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET;
    
    if (!jwtSecret) {
      console.error('JWT Secret tidak ditemukan di environment variables');
      return null;
    }
    
    // Verifikasi token
    const decoded = jwt.verify(token, jwtSecret) as TokenUser;
    
    // Pastikan token belum expired
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < now) {
      console.error('Token sudah expired');
      return null;
    }
    
    return decoded;
  } catch (error) {
    console.error('Error verifikasi token:', error);
    return null;
  }
} 