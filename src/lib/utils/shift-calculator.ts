import { format, isAfter, isBefore, isEqual, parse } from 'date-fns'
import { prisma } from '@/lib/db'

export interface ActiveShift {
  id: string
  name: string
  shiftType: string
  mainWorkStart: Date | null
  mainWorkEnd: Date | null
  employees: Array<{
    id: string
    employeeId: string
    userId: string
    departmentId: string
    subDepartmentId: string | null
    user: {
      name: string
    }
    department: {
      name: string
    }
    subDepartment: {
      name: string
    } | null
  }>
}

/**
 * Menentukan shift yang sedang berlaku berdasarkan waktu saat ini
 */
export async function getCurrentActiveShift(currentTime?: Date): Promise<ActiveShift | null> {
  const now = currentTime || new Date()
  const currentTimeStr = format(now, 'HH:mm')
  const currentDay = format(now, 'EEEE').toUpperCase() // e.g., 'MONDAY'
  
  try {
    // Ambil semua shift dengan employee data
    const shifts = await prisma.shift.findMany({
      where: {
        workingDays: {
          has: currentDay
        }
      },
      include: {
        employees: {
          where: {
            deletedAt: null // Hanya employee yang tidak dihapus
          },
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
            },
            subDepartment: {
              select: {
                name: true
              }
            }
          }
        }
      }
    })

    // Filter shift yang sedang berlaku berdasarkan waktu
    for (const shift of shifts) {
      if (!shift.mainWorkStart || !shift.mainWorkEnd) continue
      
      const shiftStartTime = format(shift.mainWorkStart, 'HH:mm')
      const shiftEndTime = format(shift.mainWorkEnd, 'HH:mm')
      
      // Parse waktu untuk perbandingan
      const currentTimeParsed = parse(currentTimeStr, 'HH:mm', now)
      const shiftStartParsed = parse(shiftStartTime, 'HH:mm', now)
      const shiftEndParsed = parse(shiftEndTime, 'HH:mm', now)
      
      // Cek apakah waktu saat ini berada dalam rentang shift
      // Pertimbangkan shift malam yang melewati tengah malam
      let isInShiftTime = false
      
      if (isBefore(shiftStartParsed, shiftEndParsed)) {
        // Shift normal (tidak melewati tengah malam)
        isInShiftTime = 
          (isAfter(currentTimeParsed, shiftStartParsed) || isEqual(currentTimeParsed, shiftStartParsed)) &&
          (isBefore(currentTimeParsed, shiftEndParsed) || isEqual(currentTimeParsed, shiftEndParsed))
      } else {
        // Shift malam (melewati tengah malam)
        isInShiftTime = 
          isAfter(currentTimeParsed, shiftStartParsed) || 
          isBefore(currentTimeParsed, shiftEndParsed)
      }
      
      if (isInShiftTime) {
        return {
          id: shift.id,
          name: shift.name,
          shiftType: shift.shiftType,
          mainWorkStart: shift.mainWorkStart,
          mainWorkEnd: shift.mainWorkEnd,
          employees: shift.employees.map(emp => ({
            id: emp.id,
            employeeId: emp.employeeId,
            userId: emp.userId,
            departmentId: emp.departmentId,
            subDepartmentId: emp.subDepartmentId,
            user: emp.user,
            department: emp.department,
            subDepartment: emp.subDepartment
          }))
        }
      }
    }
    
    return null
  } catch (error) {
    console.error('[getCurrentActiveShift] Error:', error)
    return null
  }
}

/**
 * Menghitung statistik attendance untuk shift yang sedang berlaku
 */
export async function getShiftAttendanceStats(shiftId: string, date?: Date) {
  const targetDate = date || new Date()
  const startOfDay = new Date(targetDate)
  startOfDay.setHours(0, 0, 0, 0)
  
  const endOfDay = new Date(targetDate)
  endOfDay.setHours(23, 59, 59, 999)
  
  try {
    // Ambil semua employee dalam shift ini
    const shiftEmployees = await prisma.employee.findMany({
      where: {
        shiftId: shiftId,
        deletedAt: null
      },
      include: {
        attendances: {
          where: {
            attendanceDate: {
              gte: startOfDay,
              lte: endOfDay
            }
          }
        },
        user: {
          select: {
            name: true
          }
        },
        department: {
          select: {
            name: true
          }
        },
        subDepartment: {
          select: {
            name: true
          }
        }
      }
    })
    
    const totalEmployees = shiftEmployees.length
    const presentToday = shiftEmployees.filter(emp => emp.attendances.length > 0).length
    const lateToday = shiftEmployees.filter(emp => 
      emp.attendances.some(att => att.isLate === true)
    ).length
    
    // Leave today - employees tanpa attendance (belum presensi sama sekali)
    const leaveToday = totalEmployees - presentToday
    
    return {
      totalEmployees,
      presentToday,
      lateToday,
      leaveToday,
      employees: shiftEmployees
    }
  } catch (error) {
    console.error('[getShiftAttendanceStats] Error:', error)
    return {
      totalEmployees: 0,
      presentToday: 0,
      lateToday: 0,
      leaveToday: 0,
      employees: []
    }
  }
}

/**
 * Menghitung statistik per sub department
 */
export async function getSubDepartmentStats(shiftId: string, subDepartmentId: string, date?: Date) {
  const targetDate = date || new Date()
  const startOfDay = new Date(targetDate)
  startOfDay.setHours(0, 0, 0, 0)
  
  const endOfDay = new Date(targetDate)
  endOfDay.setHours(23, 59, 59, 999)
  
  try {
    const employees = await prisma.employee.findMany({
      where: {
        shiftId: shiftId,
        subDepartmentId: subDepartmentId,
        deletedAt: null
      },
      include: {
        attendances: {
          where: {
            attendanceDate: {
              gte: startOfDay,
              lte: endOfDay
            }
          }
        }
      }
    })
    
    const totalEmployees = employees.length
    const presentToday = employees.filter(emp => emp.attendances.length > 0).length
    const lateToday = employees.filter(emp => 
      emp.attendances.some(att => att.isLate === true)
    ).length
    const leaveToday = totalEmployees - presentToday
    
    return {
      totalEmployees,
      presentToday,
      lateToday,
      leaveToday
    }
  } catch (error) {
    console.error('[getSubDepartmentStats] Error:', error)
    return {
      totalEmployees: 0,
      presentToday: 0,
      lateToday: 0,
      leaveToday: 0
    }
  }
} 