import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { format, startOfDay, endOfDay, subDays } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '7')

    // Get basic stats without authentication check
    const today = new Date()
    const startOfToday = startOfDay(today)
    const endOfToday = endOfDay(today)

    // Test basic queries
    const [totalEmployees, todayAttendances, subDepartments] = await Promise.all([
      prisma.employee.count({
        where: { deletedAt: null }
      }),
      prisma.attendance.count({
        where: {
          attendanceDate: {
            gte: startOfToday,
            lte: endOfToday
          }
        }
      }),
      prisma.subDepartment.findMany({
        select: {
          id: true,
          name: true,
          department: {
            select: { name: true }
          }
        },
        take: 10
      })
    ])

    // Generate sample chart data
    const chartData = []
    for (let i = 0; i < days; i++) {
      const date = subDays(today, days - 1 - i)
      chartData.push({
        date: format(date, 'yyyy-MM-dd'),
        day: format(date, 'EEE'),
        present: Math.floor(Math.random() * 50) + 10,
        late: Math.floor(Math.random() * 10) + 1,
        punctual: Math.floor(Math.random() * 40) + 30,
        absent: Math.floor(Math.random() * 5) + 1,
        attendanceRate: Math.floor(Math.random() * 20) + 80,
        punctualityRate: Math.floor(Math.random() * 30) + 70
      })
    }

    const response = {
      success: true,
      data: {
        activeShift: {
          id: 'test',
          name: 'Test Shift',
          shiftType: 'NORMAL',
          mainWorkStart: '08:00',
          mainWorkEnd: '17:00'
        },
        stats: {
          totalEmployees,
          presentToday: Math.floor(totalEmployees * 0.8),
          lateToday: Math.floor(totalEmployees * 0.1),
          leaveToday: Math.floor(totalEmployees * 0.05)
        },
        filteredStats: null,
        subDepartments: subDepartments.map(sd => ({
          id: sd.id,
          name: sd.name,
          departmentName: sd.department.name,
          employeeCount: Math.floor(Math.random() * 20) + 5,
          presentCount: Math.floor(Math.random() * 15) + 3
        })),
        chartData: {
          punctualityTrend: chartData,
          attendanceTrend: chartData
        },
        recentActivity: [
          {
            id: '1',
            type: 'CHECK_IN',
            title: 'Test Check-in',
            description: 'Sample activity',
            user: 'Test User',
            department: 'IT',
            timestamp: new Date().toISOString(),
            icon: 'clock'
          }
        ],
        metadata: {
          timestamp: new Date().toISOString(),
          subDepartmentFilter: null,
          currentTime: format(new Date(), 'HH:mm'),
          currentDay: format(new Date(), 'EEEE').toUpperCase(),
          isTestData: true
        }
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Test dashboard error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch test dashboard data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
