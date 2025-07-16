import { NextRequest, NextResponse } from 'next/server'
import { supabaseRouteHandler } from '@/lib/supabase/server'
import { ActivityLogger } from '@/lib/activity-logger'

export async function GET(request: NextRequest) {
  try {
    console.log('Activities API: Starting request processing')
    
    // Auth check - using getUser() instead of getSession() for security
    const supabase = await supabaseRouteHandler()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.log('Activities API: Auth failed', authError?.message)
      return NextResponse.json({ 
        success: false,
        error: 'Unauthorized' 
      }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')

    console.log('Activities API: Fetching activities with limit:', limit)
    const activities = await ActivityLogger.getRecentActivities(limit)
    
    console.log('Activities API: Retrieved activities count:', activities.length)

    return NextResponse.json({
      success: true,
      data: activities || []
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })
  } catch (error) {
    console.error('Activities API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch activities',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
