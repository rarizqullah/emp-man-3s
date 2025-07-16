import { NextRequest, NextResponse } from 'next/server';
import { supabaseRouteHandler } from '@/lib/supabase/server';
import { ActivityLogger } from '@/lib/activity-logger';

// Simple client info extraction function
async function getClientInfo(req: NextRequest) {
  // Get IP address
  let ipAddress = 
    req.headers.get('x-forwarded-for') ||
    req.headers.get('x-real-ip') ||
    req.headers.get('cf-connecting-ip') ||
    req.ip ||
    'unknown';

  // If multiple IPs in x-forwarded-for, get the first one
  if (ipAddress.includes(',')) {
    ipAddress = ipAddress.split(',')[0].trim();
  }

  // Get user agent
  const userAgent = req.headers.get('user-agent') || 'unknown';

  return { ipAddress, userAgent };
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    
    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email dan password wajib diisi' },
        { status: 400 }
      );
    }

    const supabase = await supabaseRouteHandler(req);
    
    // Get client info for logging
    const { ipAddress, userAgent } = await getClientInfo(req);
    
    console.log('🔐 Login attempt for:', email);
    console.log('📍 Client info:', { ipAddress, userAgent });

    // Attempt login
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('❌ Login failed:', error.message);
      
      // Don't log failed login attempts with invalid emails
      console.log('🚫 Not logging failed login for:', email);

      // Return user-friendly error messages
      let errorMessage = error.message;
      if (error.message.includes('Invalid login credentials')) {
        errorMessage = 'Email atau password yang Anda masukkan salah';
      } else if (error.message.includes('Email not confirmed')) {
        errorMessage = 'Email Anda belum dikonfirmasi. Silakan cek email untuk konfirmasi';
      } else if (error.message.includes('too_many_requests')) {
        errorMessage = 'Terlalu banyak percobaan login. Silakan tunggu beberapa menit';
      }

      return NextResponse.json(
        { 
          success: false, 
          message: errorMessage,
          action: 'LOGIN_FAILED'
        },
        { status: 401 }
      );
    }

    if (!authData.user) {
      console.error('❌ No user data returned from login');
      return NextResponse.json(
        { success: false, message: 'Login gagal, tidak ada data user' },
        { status: 401 }
      );
    }

    console.log('✅ Login successful for:', authData.user.email);

    // Log successful login - ONLY for valid email addresses
    try {
      const emailToLog = authData.user.email || email;
      if (emailToLog && !emailToLog.includes('unknown') && !emailToLog.includes('system')) {
        await ActivityLogger.logLogin(emailToLog, ipAddress, userAgent);
        console.log('✅ Login activity logged for:', emailToLog);
      } else {
        console.log('🚫 Skipping login log for invalid email:', emailToLog);
      }
    } catch (logError) {
      console.error('❌ Failed to log successful login:', logError);
      // Don't fail the login because of logging error
    }

    // Get user details from our database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, name, role, auth_id')
      .eq('auth_id', authData.user.id)
      .single();

    if (userError || !userData) {
      console.warn('⚠️ User not found in users table, using auth data only');
    }

    return NextResponse.json({
      success: true,
      message: 'Login berhasil',
      action: 'LOGIN_SUCCESS',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        name: userData?.name || authData.user.email,
        role: userData?.role || 'user',
        auth_id: authData.user.id
      },
      session: {
        access_token: authData.session?.access_token,
        refresh_token: authData.session?.refresh_token,
        expires_at: authData.session?.expires_at
      }
    });

  } catch (error) {
    console.error('❌ Login API error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Terjadi kesalahan sistem saat login',
        action: 'LOGIN_ERROR'
      },
      { status: 500 }
    );
  }
}
