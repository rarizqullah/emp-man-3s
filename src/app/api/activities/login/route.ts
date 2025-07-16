import { NextRequest, NextResponse } from 'next/server';
import { ActivityLogger } from '@/lib/activity-logger';
import { supabaseRouteHandler } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await supabaseRouteHandler(request);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let activities, stats;

    if (startDate && endDate) {
      // Get activities by date range
      activities = await ActivityLogger.getLoginActivitiesByDateRange(
        new Date(startDate),
        new Date(endDate)
      );
      stats = await ActivityLogger.getLoginStats();
    } else {
      // Get recent activities
      activities = await ActivityLogger.getRecentLoginActivities(limit);
      stats = await ActivityLogger.getLoginStats();
    }

    return NextResponse.json({
      success: true,
      data: {
        activities,
        stats,
        total: activities.length
      }
    });

  } catch (error) {
    console.error('❌ Login activities API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch login activities' },
      { status: 500 }
    );
  }
}
