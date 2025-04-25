import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth-service';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, fullName } = body;
    
    // Validasi input
    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email dan password diperlukan' },
        { status: 400 }
      );
    }
    
    // Validasi format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, message: 'Format email tidak valid' },
        { status: 400 }
      );
    }
    
    // Validasi panjang password
    if (password.length < 6) {
      return NextResponse.json(
        { success: false, message: 'Password harus minimal 6 karakter' },
        { status: 400 }
      );
    }
    
    try {
      // Cek apakah email sudah terdaftar di Prisma
      const existingUser = await prisma.user.findUnique({
        where: { email },
        select: { email: true }
      });
      
      if (existingUser) {
        return NextResponse.json(
          { success: false, message: 'Email sudah terdaftar' },
          { status: 400 }
        );
      }
      
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      // Simpan user ke Prisma database
      const newUser = await prisma.user.create({
        data: {
          email,
          name: fullName || email.split('@')[0],
          password: hashedPassword,
          role: 'EMPLOYEE',
        },
      });
      
      // Simpan kredensial ke Supabase untuk autentikasi
      try {
        await AuthService.registerUser({
          email,
          password: hashedPassword,
          fullName: fullName || newUser.name,
        });
      } catch (supabaseError) {
        console.error('Error saving to Supabase:', supabaseError);
        // Tetap lanjutkan karena user sudah terdaftar di Prisma
      }
      
      return NextResponse.json({
        success: true,
        message: 'Registrasi berhasil',
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
        },
      });
    } catch (error) {
      console.error('Error in registration process:', error);
      return NextResponse.json(
        { success: false, message: 'Terjadi kesalahan saat registrasi' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Registration API error:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan internal server' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 