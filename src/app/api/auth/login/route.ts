import { NextRequest, NextResponse } from 'next/server';
import { AuthService, UserData } from '@/lib/auth-service';
import { setTokenCookie } from '@/lib/jwt-server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;
    
    // Validasi input
    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email dan password diperlukan' },
        { status: 400 }
      );
    }
    
    // Coba login dengan Supabase terlebih dahulu
    let result = await AuthService.loginUser(email, password);
    
    // Jika gagal, coba dengan Prisma
    if (!result.success) {
      console.log('Supabase login failed, trying Prisma login');
      result = await AuthService.loginWithPrisma(email, password);
    }
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 401 }
      );
    }
    
    // Jika berhasil, set token di cookie
    if (result.token) {
      await setTokenCookie(result.token);
    }
    
    // Hapus password dari respons
    if (result.user) {
      // Hapus password dari hasil jika ada
      const userWithoutPassword = { ...result.user } as Record<string, unknown>;
      delete userWithoutPassword.password;
      
      result.user = userWithoutPassword as UserData;
    }
    
    return NextResponse.json({
      success: true,
      user: result.user,
      token: result.token,
    });
  } catch (error) {
    console.error('Login API error:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan internal server' },
      { status: 500 }
    );
  }
} 