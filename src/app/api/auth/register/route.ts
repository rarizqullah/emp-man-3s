import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/db";

// Schema validasi untuk registrasi
const registerSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter"),
  email: z.string().email("Email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  role: z.enum(["ADMIN", "MANAGER"]).default("MANAGER"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validasi input
    const validatedData = registerSchema.parse(body);
    
    // Cek apakah email sudah terdaftar
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });
    
    if (existingUser) {
      return NextResponse.json(
        { message: "Email sudah terdaftar" },
        { status: 400 }
      );
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 10);
    
    // Buat user baru
    const newUser = await prisma.user.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        password: hashedPassword,
        role: validatedData.role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });
    
    return NextResponse.json({
      message: "Registrasi berhasil",
      user: newUser,
    }, { status: 201 });
  } catch (error) {
    console.error("Registrasi error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Validasi input gagal", errors: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { message: "Gagal melakukan registrasi" },
      { status: 500 }
    );
  }
} 