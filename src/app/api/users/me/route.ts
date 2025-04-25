import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    // Dapatkan session Supabase untuk memeriksa apakah user terautentikasi
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Tidak terautentikasi' },
        { status: 401 }
      );
    }
    
    // Dapatkan user berdasarkan email
    const email = session.user.email;
    if (!email) {
      return NextResponse.json(
        { error: 'Email tidak ditemukan di session' },
        { status: 400 }
      );
    }
    
    // Cari user di database
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        employee: {
          select: {
            id: true,
            employeeId: true,
            contractStartDate: true,
            department: {
              select: {
                name: true
              }
            },
            subDepartment: {
              select: {
                name: true
              }
            },
            position: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });
    
    if (!user) {
      return NextResponse.json(
        { error: 'User tidak ditemukan' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat memuat profil user' },
      { status: 500 }
    );
  }
} 