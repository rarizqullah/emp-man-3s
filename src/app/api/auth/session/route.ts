import { NextRequest, NextResponse } from 'next/server';
import { supabaseRouteHandler } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🔐 Session API: Checking user session...');
    
    // Create Supabase client for route handler
    const supabase = await supabaseRouteHandler(request);
    
    // Get user with secure getUser() method
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.log('⚠️ Session API: Auth error:', error.message);
      return NextResponse.json(
        { 
          authenticated: false, 
          message: 'Session tidak valid',
          error: error.message 
        },
        { status: 401 }
      );
    }
    
    if (!user) {
      console.log('⚠️ Session API: No user found');
      return NextResponse.json(
        { 
          authenticated: false, 
          message: 'Tidak ada session aktif' 
        },
        { status: 401 }
      );
    }
    
    console.log('✅ Session API: User session verified:', user.email);
    
    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata || {},
        created_at: user.created_at,
      },
      message: 'Session valid'
    });
  } catch (error) {
    console.error('❌ Session API error:', error);
    return NextResponse.json(
      { 
        authenticated: false, 
        message: 'Terjadi kesalahan saat memeriksa session' 
      },
      { status: 500 }
    );
  }
} 