import { NextRequest, NextResponse } from 'next/server'
import { startOfDay, subDays, format } from 'date-fns'

interface CachedData {
  chartData: Array<{
    date: string
    present: number
    late: number
    absent: number
  }>
  departmentData: Array<{
    department: string
    total: number
    present: number
  }>
  stats: {
    averageAttendance: number
    averagePunctuality: number
    totalEmployees: number
    bestDepartment: {
      department: string
      total: number
      present: number
    }
  }
  metadata: {
    dateRange: {
      start: string
      end: string
    }
    totalDays: number
    department: string
    lastUpdated: string
  }
}

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
let cachedData: CachedData | null = null
let lastCacheTime: number = 0

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '7')
    const department = searchParams.get('department')
    
    // Check cache
    const now = Date.now()
    if (cachedData && (now - lastCacheTime < CACHE_DURATION)) {
      return NextResponse.json(cachedData, {
        headers: {
          'Cache-Control': 'public, max-age=300', // 5 minutes
          'X-Cache': 'HIT'
        }
      })
    }

    const endDate = new Date()
    const startDate = startOfDay(subDays(endDate, days - 1))

    // Generate sample chart data for now
    const chartData = []
    for (let i = 0; i < days; i++) {
      const currentDate = startOfDay(subDays(endDate, days - 1 - i))
      
      // Sample data - replace with real queries when schema is confirmed
      const presentCount = Math.floor(Math.random() * 20) + 30
      const lateCount = Math.floor(Math.random() * 10) + 5
      const absentCount = Math.floor(Math.random() * 5) + 2

      chartData.push({
        date: format(currentDate, 'yyyy-MM-dd'),
        present: presentCount,
        late: lateCount,
        absent: absentCount
      })
    }

    // Sample department data
    const departmentStats = [
      { department: 'IT Department', total: 25, present: 22 },
      { department: 'HR Department', total: 15, present: 14 },
      { department: 'Finance Department', total: 20, present: 18 },
      { department: 'Operations', total: 30, present: 25 }
    ]

    // Calculate overall statistics
    const totalPresent = chartData.reduce((sum, day) => sum + day.present, 0)
    const totalLate = chartData.reduce((sum, day) => sum + day.late, 0)
    const totalAbsent = chartData.reduce((sum, day) => sum + day.absent, 0)
    const totalDays = chartData.length

    const stats = {
      averageAttendance: totalDays > 0 ? Math.round(((totalPresent + totalLate) / (totalPresent + totalLate + totalAbsent)) * 100) : 0,
      averagePunctuality: totalPresent + totalLate > 0 ? Math.round((totalPresent / (totalPresent + totalLate)) * 100) : 0,
      totalEmployees: 90,
      bestDepartment: departmentStats.reduce((best, dept) => 
        dept.total > 0 && (dept.present / dept.total) > (best.present / Math.max(best.total, 1)) ? dept : best
      , { department: 'None', total: 1, present: 0 })
    }

    const response = {
      chartData,
      departmentData: departmentStats,
      stats,
      metadata: {
        dateRange: {
          start: format(startDate, 'yyyy-MM-dd'),
          end: format(endDate, 'yyyy-MM-dd')
        },
        totalDays: days,
        department: department || 'all',
        lastUpdated: new Date().toISOString()
      }
    }

    // Update cache
    cachedData = response
    lastCacheTime = now

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=300', // 5 minutes
        'X-Cache': 'MISS'
      }
    })

  } catch (error) {
    console.error('[Dashboard Analytics] Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch dashboard analytics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST endpoint for triggering real-time updates
export async function POST(request: NextRequest) {
  try {
    const { data } = await request.json()
    
    // Invalidate cache when new data comes in
    cachedData = null
    lastCacheTime = 0
    
    // Broadcast the update to SSE clients
    const sseResponse = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/events/stream`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'chart-data',
          data: data || { updated: true }
        })
      }
    )

    if (!sseResponse.ok) {
      console.warn('[Dashboard Analytics] Failed to broadcast SSE update')
    }

    return NextResponse.json({
      success: true,
      message: 'Analytics data updated and broadcasted'
    })
  } catch (error) {
    console.error('[Dashboard Analytics] POST Error:', error)
    return NextResponse.json(
      { error: 'Failed to update analytics data' },
      { status: 500 }
    )
  }
} 