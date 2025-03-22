import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import jwt from 'jsonwebtoken';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Dapatkan session dari NextAuth
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Tidak ada sesi aktif' },
        { status: 401 }
      );
    }

    // Buat JWT token
    const jwtSecret = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET;
    
    if (!jwtSecret) {
      console.error('[Auth Token] JWT Secret tidak ditemukan');
      return NextResponse.json(
        { error: 'Konfigurasi server tidak valid' },
        { status: 500 }
      );
    }

    // Buat token dengan informasi user
    const token = jwt.sign(
      {
        sub: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role,
        employeeId: session.user.employeeId,
      },
      jwtSecret,
      { expiresIn: '24h' }
    );

    // Set cookie dengan token
    const response = NextResponse.json(
      { token, user: session.user },
      { status: 200 }
    );

    // Set cookie dengan HttpOnly untuk keamanan
    response.cookies.set({
      name: 'token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 jam
    });

    return response;
  } catch (error) {
    console.error('[Auth Token] Error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat membuat token' },
      { status: 500 }
    );
  }
} 