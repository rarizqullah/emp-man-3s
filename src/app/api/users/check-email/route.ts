import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export async function GET(req: NextRequest) {
  try {
    const email = req.nextUrl.searchParams.get('email');
    
    if (!email) {
      return NextResponse.json({ 
        exists: false,
        error: "Email parameter is required" 
      }, { status: 400 });
    }
    
    // Cari user dengan email tersebut
    const user = await prisma.user.findUnique({
      where: {
        email
      },
      select: {
        id: true
      }
    });
    
    return NextResponse.json({
      exists: !!user,
      message: user ? "Email sudah digunakan" : "Email tersedia"
    });
    
  } catch (error) {
    console.error('Error checking email:', error);
    return NextResponse.json({ 
      exists: false,
      error: "Terjadi kesalahan saat memeriksa email"
    }, { status: 500 });
  }
} 