import { NextRequest, NextResponse } from 'next/server'
import { ActivityLogger } from '@/lib/activity-logger'

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testing login activity creation...')

    // Create sample login activity
    await ActivityLogger.log({
      type: 'AUTH',
      action: 'LOGIN',
      title: 'Test User Login',
      description: 'Test user berhasil masuk ke sistem melalui test endpoint',
      email: 'test@example.com',
      userId: null,
      metadata: {
        role: 'USER',
        timestamp: new Date().toISOString(), // ✅ Changed from loginTime to timestamp
        source: 'test-endpoint'
      },
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
      userAgent: request.headers.get('user-agent') || 'Test Agent'
    })

    console.log('✅ Test login activity created')

    return NextResponse.json({
      success: true,
      message: 'Test login activity created successfully'
    })

  } catch (error) {
    console.error('❌ Error creating test activity:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to create test activity',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    console.log('🔍 Fetching recent activities for test...')

    const activities = await ActivityLogger.getRecentActivities(20)
    
    console.log(`📋 Found ${activities.length} activities`)

    return NextResponse.json({
      success: true,
      data: activities,
      count: activities.length
    })

  } catch (error) {
    console.error('❌ Error fetching activities:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch activities',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
