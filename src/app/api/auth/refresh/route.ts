import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/db/prisma';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    // Coba ambil token dari cookie
    const cookieStore = await cookies();
    const tokenFromCookie = cookieStore.get('token')?.value;

    // Coba ambil token dari header Authorization
    const authHeader = request.headers.get('Authorization');
    let tokenFromHeader: string | undefined;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      tokenFromHeader = authHeader.substring(7);
    }

    // Gunakan token yang tersedia (prioritas cookie)
    const token = tokenFromCookie || tokenFromHeader;

    if (!token) {
      console.error('[Auth Refresh] Token tidak ditemukan');
      return NextResponse.json(
        { error: 'Token tidak ditemukan' },
        { status: 401 }
      );
    }

    // Ambil secret dari environment variables
    const jwtSecret = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET;
    
    if (!jwtSecret) {
      console.error('[Auth Refresh] JWT Secret tidak ditemukan');
      return NextResponse.json(
        { error: 'Konfigurasi server tidak valid' },
        { status: 500 }
      );
    }

    try {
      // Verifikasi token lama
      const decoded = jwt.verify(token, jwtSecret, { ignoreExpiration: true }) as any;
      
      // Dapatkan data user dari database untuk memastikan user masih ada/valid
      const user = await prisma.user.findUnique({
        where: { id: decoded.sub || decoded.id },
        include: { employee: true },
      });

      if (!user) {
        console.error('[Auth Refresh] User tidak ditemukan', decoded);
        return NextResponse.json(
          { error: 'User tidak ditemukan' },
          { status: 401 }
        );
      }

      // Buat token baru dengan masa berlaku 24 jam
      const newToken = jwt.sign(
        {
          sub: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          employeeId: user.employee?.id,
        },
        jwtSecret,
        { expiresIn: '24h' }
      );

      // Set cookie baru
      const response = NextResponse.json(
        { 
          token: newToken,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            employeeId: user.employee?.id,
          }
        },
        { status: 200 }
      );

      // Set cookie dengan HttpOnly untuk keamanan
      response.cookies.set({
        name: 'token',
        value: newToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24, // 24 jam
      });

      return response;
    } catch (error) {
      console.error('[Auth Refresh] Error verifikasi token:', error);
      return NextResponse.json(
        { error: 'Token tidak valid' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('[Auth Refresh] Error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan internal server' },
      { status: 500 }
    );
  }
} 