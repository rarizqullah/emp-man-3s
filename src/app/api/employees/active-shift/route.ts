import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getActiveShiftFromRotation, getCurrentShiftPhase } from '@/lib/utils/shift-rotation'

const prisma = new PrismaClient()

// GET - Mendapatkan shift aktif untuk karyawan berdasarkan tanggal
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')
    const date = searchParams.get('date') || new Date().toISOString()

    if (!employeeId) {
      return NextResponse.json(
        { error: 'Employee ID wajib diisi' },
        { status: 400 }
      )
    }

    // Ambil data karyawan beserta grup rotasinya
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        user: {
          select: { name: true }
        },
        shift: {
          select: {
            id: true,
            name: true,
            shiftType: true,
            mainWorkStart: true,
            mainWorkEnd: true,
            lunchBreakStart: true,
            lunchBreakEnd: true,
            workingDays: true
          }
        },
        shiftRotationGroup: {
          include: {
            shiftA: {
              select: {
                id: true,
                name: true,
                shiftType: true,
                mainWorkStart: true,
                mainWorkEnd: true,
                lunchBreakStart: true,
                lunchBreakEnd: true,
                workingDays: true
              }
            },
            shiftB: {
              select: {
                id: true,
                name: true,
                shiftType: true,
                mainWorkStart: true,
                mainWorkEnd: true,
                lunchBreakStart: true,
                lunchBreakEnd: true,
                workingDays: true
              }
            }
          }
        }
      }
    })

    if (!employee) {
      return NextResponse.json(
        { error: 'Karyawan tidak ditemukan' },
        { status: 404 }
      )
    }

    let activeShift
    let rotationInfo = null

    // Jika karyawan dalam grup rotasi dan grup aktif
    if (employee.shiftRotationGroup && employee.shiftRotationGroup.isActive) {
      const group = employee.shiftRotationGroup
      
      // Tentukan shift aktif berdasarkan tanggal
      const activeShiftId = getActiveShiftFromRotation(
        group.anchorDate,
        date,
        group.shiftAId,
        group.shiftBId
      )

      // Pilih shift yang aktif
      activeShift = activeShiftId === group.shiftAId ? group.shiftA : group.shiftB
      
      // Informasi rotasi
      rotationInfo = {
        groupId: group.id,
        groupName: group.name,
        currentPhase: getCurrentShiftPhase(group.anchorDate, date),
        anchorDate: group.anchorDate,
        shiftA: group.shiftA,
        shiftB: group.shiftB
      }
    } else {
      // Jika tidak dalam grup rotasi, gunakan shift tetap
      activeShift = employee.shift
    }      return NextResponse.json({
        employee: {
          id: employee.id,
          employeeId: employee.employeeId,
          name: employee.user?.name
        },
      activeShift,
      rotationInfo,
      date: date
    })
  } catch (error) {
    console.error('Error getting active shift:', error)
    return NextResponse.json(
      { error: 'Gagal mendapatkan shift aktif' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

// POST - Mendapatkan shift aktif untuk multiple karyawan
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { employeeIds, date = new Date().toISOString() } = body

    if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      return NextResponse.json(
        { error: 'Employee IDs wajib diisi dan harus berupa array' },
        { status: 400 }
      )
    }

    // Ambil data karyawan beserta grup rotasinya
    const employees = await prisma.employee.findMany({
      where: { 
        id: { in: employeeIds } 
      },
      include: {
        user: {
          select: { name: true }
        },
        shift: {
          select: {
            id: true,
            name: true,
            shiftType: true,
            mainWorkStart: true,
            mainWorkEnd: true,
            lunchBreakStart: true,
            lunchBreakEnd: true,
            workingDays: true
          }
        },
        shiftRotationGroup: {
          include: {
            shiftA: {
              select: {
                id: true,
                name: true,
                shiftType: true,
                mainWorkStart: true,
                mainWorkEnd: true,
                lunchBreakStart: true,
                lunchBreakEnd: true,
                workingDays: true
              }
            },
            shiftB: {
              select: {
                id: true,
                name: true,
                shiftType: true,
                mainWorkStart: true,
                mainWorkEnd: true,
                lunchBreakStart: true,
                lunchBreakEnd: true,
                workingDays: true
              }
            }
          }
        }
      }
    })

    const results = employees.map(employee => {
      let activeShift
      let rotationInfo = null

      // Jika karyawan dalam grup rotasi dan grup aktif
      if (employee.shiftRotationGroup && employee.shiftRotationGroup.isActive) {
        const group = employee.shiftRotationGroup
        
        // Tentukan shift aktif berdasarkan tanggal
        const activeShiftId = getActiveShiftFromRotation(
          group.anchorDate,
          date,
          group.shiftAId,
          group.shiftBId
        )

        // Pilih shift yang aktif
        activeShift = activeShiftId === group.shiftAId ? group.shiftA : group.shiftB
        
        // Informasi rotasi
        rotationInfo = {
          groupId: group.id,
          groupName: group.name,
          currentPhase: getCurrentShiftPhase(group.anchorDate, date),
          anchorDate: group.anchorDate
        }
      } else {
        // Jika tidak dalam grup rotasi, gunakan shift tetap
        activeShift = employee.shift
      }

      return {
        employee: {
          id: employee.id,
          employeeId: employee.employeeId,
          name: employee.user?.name
        },
        activeShift,
        rotationInfo
      }
    })

    return NextResponse.json({
      date: date,
      employees: results
    })
  } catch (error) {
    console.error('Error getting active shifts:', error)
    return NextResponse.json(
      { error: 'Gagal mendapatkan shift aktif' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
