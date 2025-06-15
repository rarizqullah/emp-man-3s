import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  try {
    // Cek data employees
    const employees = await prisma.employee.findMany({
      take: 10,
      include: {
        user: { select: { name: true, email: true } },
        department: true,
        position: true
      }
    });

    // Cek data attendance
    const attendances = await prisma.attendance.findMany({
      take: 20,
      include: {
        employee: {
          include: {
            user: { select: { name: true } },
            department: true
          }
        }
      },
      orderBy: { attendanceDate: 'desc' }
    });

    // Cek salary rates
    const salaryRates = await prisma.salaryRate.findMany({
      include: {
        department: true
      }
    });

    // Cek salaries yang sudah ada
    const existingSalaries = await prisma.salary.findMany({
      take: 10,
      include: {
        employee: {
          include: {
            user: { select: { name: true } },
            department: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      debug_info: {
        total_employees: employees.length,
        employees: employees.map(emp => ({
          id: emp.id,
          employeeId: emp.employeeId,
          name: emp.user.name,
          department: emp.department?.name,
          contractType: emp.contractType,
          contractEndDate: emp.contractEndDate
        })),
        total_attendances: attendances.length,
        recent_attendances: attendances.map(att => ({
          id: att.id,
          employeeId: att.employeeId,
          employeeName: att.employee.user.name,
          attendanceDate: att.attendanceDate,
          mainWorkHours: att.mainWorkHours,
          regularOvertimeHours: att.regularOvertimeHours,
          weeklyOvertimeHours: att.weeklyOvertimeHours,
          checkInTime: att.checkInTime,
          checkOutTime: att.checkOutTime
        })),
        total_salary_rates: salaryRates.length,
        salary_rates: salaryRates.map(rate => ({
          id: rate.id,
          department: rate.department.name,
          contractType: rate.contractType,
          mainWorkHourRate: rate.mainWorkHourRate,
          regularOvertimeRate: rate.regularOvertimeRate,
          weeklyOvertimeRate: rate.weeklyOvertimeRate
        })),
        existing_salaries: existingSalaries.length,
        recent_salaries: existingSalaries.map(sal => ({
          id: sal.id,
          employeeName: sal.employee.user.name,
          totalSalary: sal.totalSalary,
          paymentStatus: sal.paymentStatus,
          periodStart: sal.periodStart,
          periodEnd: sal.periodEnd
        }))
      }
    });

  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({
      success: false,
      error: 'Debug endpoint error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 