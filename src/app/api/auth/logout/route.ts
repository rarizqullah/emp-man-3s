import { NextResponse } from 'next/server';
import { removeTokenCookie } from '@/lib/jwt-server';

export async function POST() {
  try {
    // Hapus token dari cookie
    await removeTokenCookie();
    
    return NextResponse.json({
      success: true,
      message: 'Berhasil logout',
    });
  } catch (error) {
    console.error('Logout API error:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan saat logout' },
      { status: 500 }
    );
  }
} 