import { NextResponse } from 'next/server';
import { PrismaClient, Role } from '@prisma/client';
import { supabaseRouteHandler } from '@/lib/supabaseServer';

const prismaClient = new PrismaClient();

export async function POST(request: Request) {
  try {
    // Mendapatkan data dari request body
    const { authId, email, name } = await request.json();

    // Validasi data yang diperlukan
    if (!authId || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verifikasi sesi supaya kita yakin pengguna terautentikasi
    const supabase = await supabaseRouteHandler();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Error getting session:', sessionError);
      return NextResponse.json({ error: 'Error authenticating user' }, { status: 401 });
    }
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Cek dulu apakah user dengan email tersebut sudah ada
    const existingUser = await prismaClient.user.findUnique({
      where: { email }
    });

    let user;

    if (existingUser) {
      // Update user yang sudah ada
      user = await prismaClient.user.update({
        where: { email },
        data: {
          name: name || email.split('@')[0],
          authId,
          updatedAt: new Date()
        }
      });
    } else {
      // Buat user baru jika belum ada
      user = await prismaClient.user.create({
        data: {
          email,
          name: name || email.split('@')[0],
          authId,
          role: Role.EMPLOYEE
        }
      });
    }

    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    console.error('Error handling user data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await prismaClient.$disconnect();
  }
}

// Endpoint untuk mendapatkan data user berdasarkan authId
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const authId = searchParams.get('authId');

    if (!authId) {
      return NextResponse.json({ error: 'Missing authId parameter' }, { status: 400 });
    }

    const supabase = await supabaseRouteHandler();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Error getting session:', sessionError);
      return NextResponse.json({ error: 'Error authenticating user' }, { status: 401 });
    }
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Cari user berdasarkan authId
    const users = await prismaClient.user.findMany({
      where: {
        authId: {
          equals: authId
        }
      },
      take: 1
    });

    if (!users || users.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user: users[0] }, { status: 200 });
  } catch (error) {
    console.error('Error fetching user data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await prismaClient.$disconnect();
  }
}

export async function GETSupabase(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const authId = searchParams.get('authId');

    if (!authId) {
      return NextResponse.json({ error: 'Missing authId parameter' }, { status: 400 });
    }

    const supabase = await supabaseRouteHandler();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prismaClient.user.findUnique({
      where: { authId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    console.error('Error fetching user data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await prismaClient.$disconnect();
  }
} 