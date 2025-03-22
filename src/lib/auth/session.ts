import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import prisma from '@/lib/db/prisma';

export interface Session {
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  isAuthenticated: boolean;
  issuedAt?: Date;
  expiresAt?: Date;
}

/**
 * Mendapatkan session dari cookie
 */
export async function getSession(): Promise<Session | null> {
  try {
    // Gunakan pendekatan yang lebih aman untuk cookies
    let token = '';
    try {
      const cookieStore = cookies();
      token = cookieStore.get('token')?.value || '';
    } catch (e) {
      console.error('Error accessing cookies:', e);
      return { isAuthenticated: false };
    }

    if (!token) {
      return { isAuthenticated: false };
    }

    // Verifikasi token
    const secret = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET || '');

    const { payload } = await jwtVerify(token, secret, {
      algorithms: ['HS256'],
    });

    if (!payload.sub) {
      return { isAuthenticated: false };
    }

    // Dapatkan user dari database
    const user = await prisma.user.findUnique({
      where: { id: payload.sub as string },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      return { isAuthenticated: false };
    }

    return {
      user,
      isAuthenticated: true,
      issuedAt: payload.iat ? new Date(Number(payload.iat) * 1000) : undefined,
      expiresAt: payload.exp ? new Date(Number(payload.exp) * 1000) : undefined,
    };
  } catch (error) {
    console.error('Error verifying session:', error);
    return { isAuthenticated: false };
  }
}

/**
 * Memeriksa apakah session valid
 */
export async function isValidSession(): Promise<boolean> {
  const session = await getSession();
  return !!session?.isAuthenticated;
} 