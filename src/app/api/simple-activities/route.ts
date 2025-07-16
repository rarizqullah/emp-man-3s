import { NextRequest, NextResponse } from 'next/server';
import { ActivityLogger } from '@/lib/activity-logger';

type ActivityRecord = {
  id: string;
  email: string;
  action: string;
  loginTime: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const email = url.searchParams.get('email');

    let activities: ActivityRecord[];
    
    if (email) {
      // Get activities for specific user
      activities = await ActivityLogger.getRecentLoginActivities(limit);
      // Filter by email client-side for now
      activities = activities.filter((activity: ActivityRecord) => activity.email === email);
    } else {
      // Get recent activities for all users
      activities = await ActivityLogger.getRecentLoginActivities(limit);
    }

    // Format activities for display
    const formattedActivities = activities.map((activity: ActivityRecord) => ({
      id: activity.id,
      email: activity.email,
      loginTime: activity.loginTime,
      action: activity.action,
      ipAddress: activity.ipAddress,
      userAgent: activity.userAgent,
      timestamp: activity.loginTime,
      // Format for display
      title: activity.action === 'LOGIN' ? 'Login Karyawan' : 
             activity.action === 'LOGOUT' ? 'Logout Karyawan' : 
             'Login Gagal',
      description: `${activity.email} ${activity.action === 'LOGIN' ? 'berhasil login' : 
                                       activity.action === 'LOGOUT' ? 'logout' : 
                                       'gagal login'} ke sistem`,
      type: 'AUTH',
      user: activity.email.split('@')[0] // Extract username part
    }));

    return NextResponse.json({
      success: true,
      data: formattedActivities,
      total: formattedActivities.length
    });

  } catch (error) {
    console.error('❌ Failed to fetch activities:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Gagal mengambil data aktivitas',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
