import { NextRequest, NextResponse } from 'next/server'
import { supabaseRouteHandler } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import { format, startOfDay, endOfDay, subDays } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    
    // Ensure we return JSON in all cases
    const headers = {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, max-age=0'
    }
    
    // Auth check
    const supabase = await supabaseRouteHandler()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ 
        success: false,
        error: 'Unauthorized' 
      }, { 
        status: 401,
        headers 
      })
    }

    const { searchParams } = new URL(request.url)
    const subDepartmentId = searchParams.get('subDepartmentId')
    const days = parseInt(searchParams.get('days') || '7')

    // Get current time and day
    const currentTime = new Date()
    const currentTimeStr = format(currentTime, 'HH:mm')
    const currentDay = format(currentTime, 'EEEE').toUpperCase()

    // Get all shifts that are active today
    const shifts = await prisma.shift.findMany({
      where: {
        workingDays: {
          has: currentDay
        }
      },
      include: {
        employees: {
          where: {
            deletedAt: null
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    // Use first shift as active shift, or create default if none
    const activeShift = shifts.length > 0 ? shifts[0] : {
      id: 'default',
      name: 'Default Shift',
      shiftType: 'NORMAL',
      mainWorkStart: null,
      mainWorkEnd: null,
      employees: []
    }

    // Get today's date range
    const today = new Date()
    const startOfToday = startOfDay(today)
    const endOfToday = endOfDay(today)

    // Get all employees for the active shift
    const allShiftEmployees = await prisma.employee.findMany({
      where: {
        shiftId: activeShift.id,
        deletedAt: null
      },
      include: {
        attendances: {
          where: {
            attendanceDate: {
              gte: startOfToday,
              lte: endOfToday
            }
          }
        },
        subDepartment: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    // Get filtered employees for specific sub-department if requested
    const filteredEmployees = subDepartmentId && subDepartmentId !== 'all' 
      ? allShiftEmployees.filter(emp => emp.subDepartmentId === subDepartmentId)
      : allShiftEmployees

    // Calculate stats for all shift employees
    const totalEmployees = allShiftEmployees.length
    const presentToday = allShiftEmployees.filter(emp => emp.attendances.length > 0).length
    const lateToday = allShiftEmployees.filter(emp => 
      emp.attendances.some(att => att.isLate === true)
    ).length
    // Leave Today = employees who have checked out (completed their shift)
    const leaveToday = allShiftEmployees.filter(emp => 
      emp.attendances.some(att => att.checkOutTime !== null)
    ).length

    // Calculate stats for filtered employees (for sub-department view)
    const filteredStats = {
      totalEmployees: filteredEmployees.length,
      presentToday: filteredEmployees.filter(emp => emp.attendances.length > 0).length,
      lateToday: filteredEmployees.filter(emp => 
        emp.attendances.some(att => att.isLate === true)
      ).length,
      // Leave Today = employees who have checked out (completed their shift)
      leaveToday: filteredEmployees.filter(emp => 
        emp.attendances.some(att => att.checkOutTime !== null)
      ).length
    }

    // Get all active sub departments (not limited to current shift since there might be no active shift)
    const subDepartments = await prisma.subDepartment.findMany({
      select: {
        id: true,
        name: true,
        departmentId: true,
        department: {
          select: {
            name: true
          }
        },
        employees: {
          where: {
            deletedAt: null
          },
          select: {
            id: true,
            shiftId: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    // Generate chart data based on historical attendance or sample data
    const chartData = []
    for (let i = 0; i < days; i++) {
      const date = subDays(today, days - 1 - i)
      const dayStart = startOfDay(date)
      const dayEnd = endOfDay(date)
      
      // Get attendance for this day if we have an active shift
      let dayAttendances = []
      if (activeShift.id !== 'default') {
        dayAttendances = await prisma.attendance.findMany({
          where: {
            attendanceDate: {
              gte: dayStart,
              lte: dayEnd
            },
            employee: {
              shiftId: activeShift.id,
              deletedAt: null,
              ...(subDepartmentId && subDepartmentId !== 'all' ? { subDepartmentId } : {})
            }
          },
          include: {
            employee: true
          }
        })
      }

      const dayEmployees = subDepartmentId && subDepartmentId !== 'all' 
        ? filteredEmployees 
        : allShiftEmployees

      // Use only real data from database
      let present, late, punctual, absent, attendanceRate, punctualityRate
      
      // Real data from actual employees and attendance records
      present = dayAttendances.length
      late = dayAttendances.filter((att: any) => att.isLate === true).length
      punctual = present - late
      absent = dayEmployees.length - present
      attendanceRate = dayEmployees.length > 0 ? Math.round((present / dayEmployees.length) * 100) : 0
      punctualityRate = present > 0 ? Math.round((punctual / present) * 100) : 100

      chartData.push({
        date: format(date, 'yyyy-MM-dd'),
        day: format(date, 'EEE'),
        present,
        late,
        punctual,
        absent,
        attendanceRate,
        punctualityRate
      })
    }
    
    // Get recent activity from various sources
    const recentActivity: any[] = []

    // Get recent check-ins
    const recentCheckIns = await prisma.attendance.findMany({
      where: {
        employee: {
          shiftId: activeShift.id,
          deletedAt: null
        },
        checkInTime: {
          not: null
        }
      },
      include: {
        employee: {
          select: {
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
      take: 5
    })

    // Add check-in activities
    recentCheckIns.forEach((attendance) => {
      if (attendance.checkInTime) {
        recentActivity.push({
          id: `checkin-${attendance.id}`,
          type: 'CHECK_IN',
          title: 'Check In',
          description: `${attendance.employee.user.name} melakukan check-in`,
          user: attendance.employee.user.name,
          department: attendance.employee.department.name,
          timestamp: attendance.checkInTime.toISOString(),
          icon: 'clock-in'
        })
      }
    })

    // Get recent check-outs
    const recentCheckOuts = await prisma.attendance.findMany({
      where: {
        employee: {
          shiftId: activeShift.id,
          deletedAt: null
        },
        checkOutTime: {
          not: null
        }
      },
      include: {
        employee: {
          select: {
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
        checkOutTime: 'desc'
      },
      take: 3
    })

    // Add check-out activities
    recentCheckOuts.forEach((attendance) => {
      if (attendance.checkOutTime) {
        recentActivity.push({
          id: `checkout-${attendance.id}`,
          type: 'CHECK_OUT',
          title: 'Check Out',
          description: `${attendance.employee.user.name} melakukan check-out`,
          user: attendance.employee.user.name,
          department: attendance.employee.department.name,
          timestamp: attendance.checkOutTime.toISOString(),
          icon: 'clock-out'
        })
      }
    })

    // Sort activities by timestamp
    recentActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    // Limit to 10 most recent activities
    const limitedActivity = recentActivity.slice(0, 10)

    const response = {
      success: true,
      data: {
        activeShift: {
          id: activeShift.id,
          name: activeShift.name,
          shiftType: activeShift.shiftType || 'NORMAL',
          mainWorkStart: activeShift.mainWorkStart ? format(activeShift.mainWorkStart, 'HH:mm') : null,
          mainWorkEnd: activeShift.mainWorkEnd ? format(activeShift.mainWorkEnd, 'HH:mm') : null
        },
        stats: {
          totalEmployees,
          presentToday,
          lateToday,
          leaveToday
        },
        filteredStats: subDepartmentId && subDepartmentId !== 'all' ? filteredStats : null,
        subDepartments: subDepartments.map(sd => {
          // Count employees for this sub-department in the active shift
          const employeesInShift = allShiftEmployees.filter(emp => emp.subDepartmentId === sd.id)
          return {
            id: sd.id,
            name: sd.name,
            departmentName: sd.department.name,
            employeeCount: employeesInShift.length,
            presentCount: employeesInShift.filter(emp => emp.attendances.length > 0).length
          }
        }),
        chartData: {
          punctualityTrend: chartData,
          attendanceTrend: chartData
        },
        recentActivity: limitedActivity,
        metadata: {
          timestamp: new Date().toISOString(),
          subDepartmentFilter: subDepartmentId,
          currentTime: currentTimeStr,
          currentDay: currentDay
        }
      }
    }

    return NextResponse.json(response, { headers })
  } catch (error) {
    
    const headers = {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, max-age=0'
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch dashboard analytics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { 
        status: 500,
        headers 
      }
    )
  }
} 