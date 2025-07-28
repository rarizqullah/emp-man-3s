import { NextResponse } from 'next/server';
import { PrismaClient, Role } from '@prisma/client';
import { supabaseRouteHandler } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

const prismaClient = new PrismaClient();

export async function POST(request: Request) {
  try {
    // Mendapatkan data dari request body
    const { authId, email, name } = await request.json();
    
    console.log('🔍 POST /api/users called with:', { authId, email, name });

    // Validasi data yang diperlukan
    if (!authId || !email) {
      console.error('❌ Missing required fields:', { authId: !!authId, email: !!email });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validasi user menggunakan Supabase Admin - lebih reliable daripada session
    try {
      const adminClient = supabaseAdmin();
      const { data: adminUser, error: adminError } = await adminClient.auth.admin.getUserById(authId);
      
      console.log('🔐 Admin user validation:', { 
        userFound: !!adminUser, 
        userEmail: adminUser?.user?.email,
        providedEmail: email,
        error: adminError?.message 
      });

      if (adminError || !adminUser?.user) {
        console.error('❌ Invalid user - admin validation failed:', adminError?.message);
        return NextResponse.json({ error: 'Invalid user' }, { status: 401 });
      }

      // Verifikasi bahwa email yang diberikan sama dengan email di Supabase
      if (adminUser.user.email !== email) {
        console.error('❌ Email mismatch:', { 
          supabaseEmail: adminUser.user.email, 
          providedEmail: email 
        });
        return NextResponse.json({ error: 'Email mismatch' }, { status: 401 });
      }

      console.log('✅ User validation successful');
      
    } catch (error) {
      console.error('❌ Error validating user with admin:', error);
      return NextResponse.json({ error: 'User validation failed' }, { status: 401 });
    }

    // Cek dulu apakah user dengan email tersebut sudah ada
    const existingUser = await prismaClient.user.findUnique({
      where: { email }
    });

    console.log('👤 User check result:', { 
      existingUser: existingUser ? 'Found' : 'Not found',
      existingUserId: existingUser?.id 
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
      console.log('✅ User updated:', user.id);
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
      console.log('✅ User created:', user.id);
    }

    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    console.error('❌ Error handling user data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await prismaClient.$disconnect();
  }
}

// Fallback endpoint untuk user creation yang tidak memerlukan sync
export async function PUT(request: Request) {
  try {
    const { authId, email, name } = await request.json();
    
    console.log('🔄 PUT /api/users (fallback) called with:', { authId, email, name });

    if (!authId || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Langsung cek dan buat user tanpa validasi session
    const existingUser = await prismaClient.user.findFirst({
      where: { 
        OR: [
          { email },
          { authId }
        ]
      }
    });

    let user;

    if (existingUser) {
      user = await prismaClient.user.update({
        where: { id: existingUser.id },
        data: {
          name: name || email.split('@')[0],
          authId,
          email,
          updatedAt: new Date()
        }
      });
      console.log('✅ User updated (fallback):', user.id);
    } else {
      user = await prismaClient.user.create({
        data: {
          email,
          name: name || email.split('@')[0],
          authId,
          role: Role.EMPLOYEE
        }
      });
      console.log('✅ User created (fallback):', user.id);
    }

    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    console.error('❌ Error in fallback user creation:', error);
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

    const supabase = await supabaseRouteHandler(request);
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('Error getting user:', userError);
      return NextResponse.json({ error: 'Error authenticating user' }, { status: 401 });
    }
    
    if (!user) {
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

    const supabase = await supabaseRouteHandler(request);
    const { data: { user: authUser }, error } = await supabase.auth.getUser();
    
    if (error || !authUser) {
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