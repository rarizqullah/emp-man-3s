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
    const supabase = await supabaseRouteHandler(req);
    
    // Verify current session
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { action, metadata } = await req.json();
    
    if (!action) {
      return NextResponse.json(
        { success: false, message: 'Action is required' },
        { status: 400 }
      );
    }

    // Get client info
    const { ipAddress, userAgent } = await getClientInfo(req);
    
    // Log custom activity
    try {
      switch (action) {
        case 'PAGE_ACCESS':
          await ActivityLogger.log({
            type: 'AUTH',
            action: 'PAGE_ACCESS',
            title: 'Page Access',
            description: `User mengakses halaman: ${metadata?.page || 'unknown'}`,
            userId: user.id,
            metadata: {
              ...metadata,
              email: user.email
            },
            ipAddress,
            userAgent
          });
          break;
          
        case 'SESSION_REFRESH':
          await ActivityLogger.log({
            type: 'AUTH',
            action: 'SESSION_REFRESH',
            title: 'Session Refresh',
            description: `Sesi user ${user.email} berhasil di-refresh`,
            userId: user.id,
            metadata: {
              ...metadata,
              email: user.email
            },
            ipAddress,
            userAgent
          });
          break;
          
        case 'AUTH_CHECK':
          await ActivityLogger.log({
            type: 'AUTH',
            action: 'AUTH_CHECK',
            title: 'Authentication Check',
            description: `Pemeriksaan autentikasi untuk user ${user.email}`,
            userId: user.id,
            metadata: {
              ...metadata,
              email: user.email
            },
            ipAddress,
            userAgent
          });
          break;
          
        default:
          return NextResponse.json(
            { success: false, message: 'Invalid action' },
            { status: 400 }
          );
      }
    } catch (logError) {
      console.error('❌ Failed to log activity:', logError);
      // Don't fail the request because of logging error
    }

    console.log(`📋 Activity logged: ${action} for ${user.email}`);

    return NextResponse.json({
      success: true,
      message: 'Activity logged successfully',
      action
    });

  } catch (error) {
    console.error('❌ Activity logging error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to log activity',
      },
      { status: 500 }
    );
  }
}
