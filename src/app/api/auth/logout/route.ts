import { NextRequest, NextResponse } from 'next/server';
import { supabaseRouteHandler } from '@/lib/supabase/server';
import { ActivityLogger } from '@/lib/activity-logger';
import { removeTokenCookie } from '@/lib/jwt-server';

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
    const supabase = await supabaseRouteHandler(req);
    
    // Get current user session before logout
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    // Get client info for logging
    const { ipAddress, userAgent } = await getClientInfo(req);
    
    if (!userError && user) {
      console.log('🔓 Logout attempt for:', user.email);
      
      // Log logout before actually logging out
      try {
        await ActivityLogger.logAuth(
          'LOGOUT',
          user.id,
          ipAddress,
          userAgent
        );
      } catch (logError) {
        console.error('❌ Failed to log logout:', logError);
      }
    }

    // Perform Supabase logout
    const { error: signOutError } = await supabase.auth.signOut();
    
    if (signOutError) {
      console.warn('⚠️ Supabase logout warning:', signOutError.message);
    }

    // Also remove JWT token cookie (legacy support)
    await removeTokenCookie();
    
    if (user) {
      console.log('✅ Logout successful for:', user.email);
    }

    return NextResponse.json({
      success: true,
      message: 'Berhasil logout',
      action: 'LOGOUT_SUCCESS'
    });

  } catch (error) {
    console.error('❌ Logout API error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Terjadi kesalahan sistem saat logout',
        action: 'LOGOUT_ERROR'
      },
      { status: 500 }
    );
  }
} 