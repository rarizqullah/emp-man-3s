import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/db";

// Schema validasi untuk login
const loginSchema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validasi input
    const validatedData = loginSchema.parse(body);
    
    // Cari user berdasarkan email
    const user = await prisma.user.findUnique({
      where: { email: validatedData.email },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        role: true,
      },
    });
    
    if (!user) {
      return NextResponse.json(
        { message: "Email atau password tidak valid" },
        { status: 401 }
      );
    }
    
    // Verifikasi password
    const passwordMatch = await bcrypt.compare(
      validatedData.password,
      user.password
    );
    
    if (!passwordMatch) {
      return NextResponse.json(
        { message: "Email atau password tidak valid" },
        { status: 401 }
      );
    }
    
    // Ambil JWT secret dari environment variables
    const jwtSecret = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET;
    
    if (!jwtSecret) {
      console.error("JWT Secret tidak ditemukan di environment variables");
      return NextResponse.json(
        { message: "Konfigurasi server tidak valid" },
        { status: 500 }
      );
    }
    
    // Buat payload untuk token
    const tokenPayload = { 
      id: user.id, 
      email: user.email,
      role: user.role,
      name: user.name,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
    };
    
    // Buat JWT token
    const token = jwt.sign(tokenPayload, jwtSecret);
    
    console.log(`[API] Login sukses: ${user.email} (${user.role})`);
    
    // Return user data dan token
    return NextResponse.json({
      message: "Login berhasil",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Validasi input gagal", errors: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { message: "Gagal melakukan login" },
      { status: 500 }
    );
  }
} 