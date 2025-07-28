import { NextRequest, NextResponse } from 'next/server'
import { supabaseRouteHandler } from '@/lib/supabase/server'
import { prisma, safeQuery, ensureDatabaseConnection } from '@/lib/db'
import { format, startOfDay, endOfDay, subDays } from 'date-fns'
import { ActivityLogger } from '@/lib/activity-logger'

export async function GET(request: NextRequest) {
  try {
    
    // Ensure we return JSON in all cases
    const headers = {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, max-age=0'
    }
    
    // Check database connection first with timeout
    const dbHealthy = await ensureDatabaseConnection();
    if (!dbHealthy) {
      console.error('Database connection failed');
      return NextResponse.json({ 
        success: false,
        error: 'Database connection unavailable',
        details: 'Please try again in a moment'
      }, { 
        status: 503,
        headers 
      });
    }
    
    // Auth check with better error handling
    const supabase = await supabaseRouteHandler()
    
    let user = null
    try {
      // Add timeout for auth user check
      const userPromise = supabase.auth.getUser();
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Auth user timeout')), 3000)
      );
      
      const { data: { user: userData }, error: userError } = await Promise.race([
        userPromise, 
        timeoutPromise
      ]);
      
      user = userData
      
      if (userError) {
        console.error('User auth error:', userError)
        return NextResponse.json({ 
          success: false,
          error: 'Authentication error',
          details: userError.message
        }, { 
          status: 401,
          headers 
        })
      }
    } catch (error) {
      console.error('Auth check error:', error)
      return NextResponse.json({ 
        success: false,
        error: 'Authentication service unavailable',
        details: error instanceof Error ? error.message : 'Unknown auth error'
      }, { 
        status: 503,
        headers 
      })
    }

    if (!user) {
      console.log('No valid user found for dashboard request')
      return NextResponse.json({ 
        success: false,
        error: 'Unauthorized - Please login again'
      }, { 
        status: 401,
        headers 
      })
    }

    console.log(`Dashboard API accessed by user: ${user.email}`)

    const { searchParams } = new URL(request.url)
    const subDepartmentId = searchParams.get('subDepartmentId')
    const days = parseInt(searchParams.get('days') || '7')

    // Get current time and day
    const currentTime = new Date()
    const currentTimeStr = format(currentTime, 'HH:mm')
    const currentDay = format(currentTime, 'EEEE').toUpperCase()

    // Get all shifts that are active today (handle both string array and potential format issues)
    const shifts = await safeQuery(
      () => prisma.shift.findMany({
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
      }),
      2, // max retries
      8000 // 8 second timeout
    );

    // Filter shifts by working day (handle both array formats and empty arrays)
    const activeShifts = shifts.filter(shift => {
      if (!shift.workingDays || shift.workingDays.length === 0) {
        // If no working days specified, assume it works all days
        return true
      }
      
      // Check if current day is in working days (handle different formats)
      return shift.workingDays.includes(currentDay) || 
             shift.workingDays.includes(currentDay.toLowerCase()) ||
             shift.workingDays.includes(currentDay.toUpperCase())
    })

    // Use first active shift, or fallback to first shift, or create default
    const activeShift = activeShifts.length > 0 ? activeShifts[0] : 
                      shifts.length > 0 ? shifts[0] : {
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

    // Get all employees for the active shift (handle default case better)
    let allShiftEmployees = []
    if (activeShift.id !== 'default') {
      allShiftEmployees = await safeQuery(
        () => prisma.employee.findMany({
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
        }),
        2, // max retries
        8000 // 8 second timeout
      );
    } else {
      // If no active shift, get all employees to show some data
      allShiftEmployees = await safeQuery(
        () => prisma.employee.findMany({
          where: {
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
          },
          take: 100 // Limit to avoid overwhelming data
        }),
        2, // max retries
        8000 // 8 second timeout
      );
    }    // Get filtered employees for specific sub-department if requested
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
      
      // Get attendance for this day
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
      } else {
        // If no active shift, get attendance from all employees
        dayAttendances = await prisma.attendance.findMany({
          where: {
            attendanceDate: {
              gte: dayStart,
              lte: dayEnd
            },
            employee: {
              deletedAt: null,
              ...(subDepartmentId && subDepartmentId !== 'all' ? { subDepartmentId } : {})
            }
          },
          include: {
            employee: true
          },
          take: 100 // Limit to avoid overwhelming data
        })
      }

      const dayEmployees = subDepartmentId && subDepartmentId !== 'all' 
        ? filteredEmployees 
        : allShiftEmployees

      // Calculate stats with fallback for empty data
      const present = dayAttendances.length
      const late = dayAttendances.filter((att) => att.isLate === true).length
      const punctual = present - late
      const absent = Math.max(0, dayEmployees.length - present)
      const attendanceRate = dayEmployees.length > 0 ? Math.round((present / dayEmployees.length) * 100) : 0
      const punctualityRate = present > 0 ? Math.round((punctual / present) * 100) : 100

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
    
    // Get recent activity from ActivityLogger
    const recentActivity = await ActivityLogger.getRecentActivities(10)

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
        recentActivity: recentActivity,
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