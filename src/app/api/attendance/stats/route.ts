import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { startOfDay, endOfDay, format } from 'date-fns'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const today = new Date()
    const todayStart = startOfDay(today)
    const todayEnd = endOfDay(today)

    // Get total active employees
    const totalEmployees = await prisma.employee.count({
      where: {
        deletedAt: null
      }
    })

    // Get today's attendance data
    const [
      presentToday,
      lateToday,
      onLeaveToday,
      averageCheckInData
    ] = await Promise.all([
      // Present employees (including late)
      prisma.attendance.count({
        where: {
          checkInTime: {
            gte: todayStart,
            lte: todayEnd
          },
          status: {
            in: ['PRESENT', 'LATE']
          }
        }
      }),

      // Late employees
      prisma.attendance.count({
        where: {
          checkInTime: {
            gte: todayStart,
            lte: todayEnd
          },
          status: 'LATE'
        }
      }),

      // Employees on leave today
      prisma.employeePermission.count({
        where: {
          startDate: {
            lte: today
          },
          endDate: {
            gte: today
          },
          status: 'APPROVED'
        }
      }),

      // Average check-in time
      prisma.attendance.findMany({
        where: {
          checkInTime: {
            gte: todayStart,
            lte: todayEnd
          },
          status: {
            in: ['PRESENT', 'LATE']
          }
        },
        select: {
          checkInTime: true
        }
      })
    ])

    // Calculate absent employees
    const absentToday = totalEmployees - presentToday - onLeaveToday

    // Calculate average check-in time
    let averageCheckInTime = "08:00"
    if (averageCheckInData.length > 0) {
      const totalMinutes = averageCheckInData.reduce((sum, record) => {
        const checkInTime = new Date(record.checkInTime)
        const minutes = checkInTime.getHours() * 60 + checkInTime.getMinutes()
        return sum + minutes
      }, 0)
      
      const avgMinutes = Math.round(totalMinutes / averageCheckInData.length)
      const hours = Math.floor(avgMinutes / 60)
      const minutes = avgMinutes % 60
      averageCheckInTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
    }

    // Calculate punctuality rate
    const punctualityRate = presentToday > 0 
      ? Math.round(((presentToday - lateToday) / presentToday) * 100)
      : 0

    const stats = {
      totalEmployees,
      presentToday,
      lateToday,
      onLeaveToday,
      absentToday,
      averageCheckInTime,
      punctualityRate,
      // Additional metrics
      attendanceRate: totalEmployees > 0 
        ? Math.round((presentToday / totalEmployees) * 100)
        : 0,
      lateRate: presentToday > 0
        ? Math.round((lateToday / presentToday) * 100)
        : 0,
      timestamp: new Date().toISOString(),
      date: format(today, 'yyyy-MM-dd')
    }

    return NextResponse.json(stats, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60'
      }
    })

  } catch (error) {
    console.error('[Attendance Stats API] Error fetching stats:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

// POST endpoint untuk trigger real-time broadcast
export async function POST(request: NextRequest) {
  try {
    // Import broadcast function
    const { broadcastToAllClients } = await import('../../events/stream/route')
    
    // Fetch fresh stats
    const statsResponse = await GET(request)
    
    if (statsResponse.status === 200) {
      const statsData = await statsResponse.json()
      
      // Broadcast ke semua clients
      broadcastToAllClients('attendance-stats', statsData)
      
      return NextResponse.json({
        success: true,
        message: 'Attendance stats refreshed and broadcasted',
        stats: statsData,
        timestamp: new Date().toISOString()
      })
    }
    
    return NextResponse.json(
      { error: 'Failed to refresh attendance stats' },
      { status: 500 }
    )
    
  } catch (error) {
    console.error('[Attendance Stats API] Error broadcasting stats:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to broadcast attendance stats',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 