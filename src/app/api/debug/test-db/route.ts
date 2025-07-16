import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Test basic database connection
    const employeeCount = await prisma.employee.count({
      where: {
        deletedAt: null
      }
    })

    const attendanceCount = await prisma.attendance.count({
      where: {
        attendanceDate: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lte: new Date(new Date().setHours(23, 59, 59, 999))
        }
      }
    })

    const subDepartmentCount = await prisma.subDepartment.count()

    const response = {
      success: true,
      message: 'Database connection successful',
      data: {
        employees: employeeCount,
        todayAttendances: attendanceCount,
        subDepartments: subDepartmentCount,
        timestamp: new Date().toISOString()
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Database test error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Database connection failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
