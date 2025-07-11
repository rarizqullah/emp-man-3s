import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { subDays, format } from 'date-fns'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const days = parseInt(url.searchParams.get('days') || '1')
    
    const startDate = subDays(new Date(), days)

    // Get recent attendance activities
    const recentAttendance = await prisma.attendance.findMany({
      where: {
        checkInTime: {
          gte: startDate
        }
      },
      include: {
        employee: {
          include: {
            user: {
              select: {
                name: true
              }
            },
            department: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        checkInTime: 'desc'
      },
      take: limit
    })

    // Get recent leave requests
    const recentLeaveRequests = await prisma.employeePermission.findMany({
      where: {
        createdAt: {
          gte: startDate
        }
      },
      include: {
        user: {
          select: {
            name: true,
            employee: {
              select: {
                department: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: Math.ceil(limit / 2)
    })

    // Transform attendance data to activity format
    const attendanceActivities = recentAttendance.map(attendance => ({
      id: `attendance_${attendance.id}`,
      type: attendance.checkOutTime ? 'CHECK_OUT' : 'CHECK_IN',
      employeeName: attendance.employee.user.name,
      employeeId: attendance.employee.id,
      department: attendance.employee.department?.name || 'N/A',
      timestamp: attendance.checkOutTime || attendance.checkInTime,
      message: attendance.checkOutTime 
        ? `${attendance.employee.user.name} melakukan check-out`
        : `${attendance.employee.user.name} melakukan check-in`,
      status: attendance.status === 'LATE' ? 'warning' : 'success',
      metadata: {
        checkInTime: attendance.checkInTime,
        checkOutTime: attendance.checkOutTime,
        status: attendance.status,
        workingHours: attendance.workingHours
      }
    }))

    // Transform leave requests to activity format
    const leaveActivities = recentLeaveRequests.map(leave => ({
      id: `leave_${leave.id}`,
      type: 'LEAVE_REQUEST',
      employeeName: leave.user.name,
      employeeId: leave.user.id,
      department: leave.user.employee?.department?.name || 'N/A',
      timestamp: leave.createdAt,
      message: `${leave.user.name} mengajukan ${getLeaveTypeLabel(leave.type)}`,
      status: getLeaveStatusColor(leave.status),
      metadata: {
        leaveType: leave.type,
        status: leave.status,
        startDate: leave.startDate,
        endDate: leave.endDate,
        reason: leave.reason
      }
    }))

    // Combine and sort all activities
    const allActivities = [...attendanceActivities, ...leaveActivities]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)

    // Add relative time information
    const activitiesWithTime = allActivities.map(activity => ({
      ...activity,
      timestamp: activity.timestamp.toISOString(),
      timeAgo: getTimeAgo(activity.timestamp),
      date: format(new Date(activity.timestamp), 'dd/MM/yyyy'),
      time: format(new Date(activity.timestamp), 'HH:mm:ss')
    }))

    return NextResponse.json({
      activities: activitiesWithTime,
      count: activitiesWithTime.length,
      timestamp: new Date().toISOString()
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30'
      }
    })

  } catch (error) {
    console.error('[Recent Activities API] Error fetching activities:', error)
    
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

// Helper functions
function getLeaveTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'SICK': 'izin sakit',
    'VACATION': 'cuti tahunan',
    'PERSONAL': 'izin pribadi',
    'MATERNITY': 'cuti melahirkan',
    'PATERNITY': 'cuti ayah',
    'EMERGENCY': 'izin darurat',
    'STUDY': 'izin belajar',
    'UNPAID': 'cuti tanpa gaji'
  }
  return labels[type] || 'izin/cuti'
}

function getLeaveStatusColor(status: string): 'success' | 'warning' | 'error' | 'info' {
  switch (status) {
    case 'APPROVED':
      return 'success'
    case 'PENDING':
      return 'warning'
    case 'REJECTED':
      return 'error'
    default:
      return 'info'
  }
}

function getTimeAgo(timestamp: Date): string {
  const now = new Date()
  const diffInMinutes = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60))
  
  if (diffInMinutes < 1) {
    return 'Baru saja'
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} menit yang lalu`
  } else if (diffInMinutes < 1440) { // 24 hours
    const hours = Math.floor(diffInMinutes / 60)
    return `${hours} jam yang lalu`
  } else {
    const days = Math.floor(diffInMinutes / 1440)
    return `${days} hari yang lalu`
  }
}

// POST endpoint untuk broadcast real-time activity
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { activityType, employeeData, metadata } = body

    // Import broadcast function
    const { broadcastToAllClients } = await import('../../events/stream/route')

    // Create activity object
    const activity = {
      id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: activityType,
      employeeName: employeeData.name,
      employeeId: employeeData.id,
      department: employeeData.department,
      timestamp: new Date().toISOString(),
      message: generateActivityMessage(activityType, employeeData, metadata),
      status: getActivityStatus(activityType, metadata),
      metadata
    }

    // Broadcast activity to all clients
    if (activityType === 'CHECK_IN') {
      broadcastToAllClients('employee-checkin', {
        ...employeeData,
        timestamp: activity.timestamp,
        isLate: metadata?.isLate || false,
        lateMinutes: metadata?.lateMinutes || 0
      })
    } else if (activityType === 'CHECK_OUT') {
      broadcastToAllClients('employee-checkout', {
        ...employeeData,
        timestamp: activity.timestamp,
        workingHours: metadata?.workingHours || 0
      })
    } else if (activityType === 'LEAVE_REQUEST') {
      broadcastToAllClients('leave-request', {
        ...employeeData,
        timestamp: activity.timestamp,
        leaveType: getLeaveTypeLabel(metadata?.leaveType || ''),
        status: metadata?.status || 'PENDING'
      })
    }

    // Also broadcast as general recent activity
    broadcastToAllClients('recent-activity', activity)

    return NextResponse.json({
      success: true,
      message: 'Activity broadcasted successfully',
      activity,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[Recent Activities API] Error broadcasting activity:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to broadcast activity',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

function generateActivityMessage(
  activityType: string, 
  employeeData: any, 
  metadata: any
): string {
  switch (activityType) {
    case 'CHECK_IN':
      return metadata?.isLate 
        ? `${employeeData.name} check-in terlambat ${metadata.lateMinutes} menit`
        : `${employeeData.name} melakukan check-in`
        
    case 'CHECK_OUT':
      return `${employeeData.name} melakukan check-out`
      
    case 'LEAVE_REQUEST':
      return `${employeeData.name} mengajukan ${getLeaveTypeLabel(metadata?.leaveType || '')}`
      
    case 'LATE_ARRIVAL':
      return `${employeeData.name} terlambat ${metadata?.lateMinutes || 0} menit`
      
    default:
      return `${employeeData.name} melakukan aktivitas`
  }
}

function getActivityStatus(activityType: string, metadata: any): 'success' | 'warning' | 'error' | 'info' {
  switch (activityType) {
    case 'CHECK_IN':
      return metadata?.isLate ? 'warning' : 'success'
      
    case 'CHECK_OUT':
      return 'info'
      
    case 'LEAVE_REQUEST':
      return getLeaveStatusColor(metadata?.status || 'PENDING')
      
    case 'LATE_ARRIVAL':
      return 'warning'
      
    default:
      return 'info'
  }
} 