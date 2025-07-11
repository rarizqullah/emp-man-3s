/* eslint-disable */
// @ts-nocheck
import { test, expect, type Page, type Route } from '@playwright/test'
import { PrismaClient, AttendanceStatus, ContractType, ShiftType, Gender, Role, type Attendance, Prisma } from '@prisma/client'
import { startOfDay, subDays, addHours, format } from 'date-fns'

// Use a shared PrismaClient instance for the whole test suite
const prisma = new PrismaClient()

test.describe('Dashboard – real database integration', () => {
  // Run the tests for this file serially because we are mutating the DB
  test.describe.configure({ mode: 'serial' })

  const EMPLOYEE_COUNT = 20
  const DAYS = 7

  /** IDs we need for cleanup */
  let departmentId: string
  let subDepartmentId: string
  let shiftId: string

  test.beforeAll(async () => {
    // 1. Clean only the relevant tables to guarantee a predictable state
    await prisma.attendance.deleteMany()
    await prisma.employee.deleteMany()
    await prisma.shift.deleteMany()
    await prisma.user.deleteMany()
    await prisma.subDepartment.deleteMany()
    await prisma.department.deleteMany()

    // 2. Seed reference data: department, sub-department, shift
    const department = await prisma.department.create({
      data: { name: 'Engineering' },
    })
    departmentId = department.id

    const subDepartment = await prisma.subDepartment.create({
      data: {
        name: 'Backend',
        departmentId,
      },
    })
    subDepartmentId = subDepartment.id

    const shift = await prisma.shift.create({
      data: {
        name: 'Regular Shift',
        shiftType: ShiftType.NON_SHIFT,
        workingDays: [
          'MONDAY',
          'TUESDAY',
          'WEDNESDAY',
          'THURSDAY',
          'FRIDAY',
          'SATURDAY',
          'SUNDAY',
        ],
      },
    })
    shiftId = shift.id

    // 3. Create users & employees in a single transaction for speed
    const employeeCreates = [...Array(EMPLOYEE_COUNT)].map((_, idx) => {
      const employeeNo = idx + 1
      return prisma.employee.create({
        data: {
          user: {
            create: {
              email: `test.user.${employeeNo}@example.com`,
              name: `Test User ${employeeNo}`,
              phone: null,
              role: Role.EMPLOYEE,
              authId: `auth-${employeeNo}`,
            },
          },
          employeeId: `EMP${String(employeeNo).padStart(3, '0')}`,
          contractType: ContractType.PERMANENT,
          contractStartDate: new Date(),
          gender: Gender.MALE,
          department: { connect: { id: departmentId } },
          subDepartment: { connect: { id: subDepartmentId } },
          shift: { connect: { id: shiftId } },
        },
      })
    })

    const employees = await prisma.$transaction(employeeCreates)

    // 4. Create attendance records for each employee for the last 7 days
    const today = startOfDay(new Date())
    const attendanceCreates: Prisma.PrismaPromise<Attendance>[] = []

    for (let d = 0; d < DAYS; d++) {
      const attendanceDate = subDays(today, d)

      employees.forEach((emp, idx) => {
        // Simple rule: every 5th employee is late on even days
        const isLate = d % 2 === 0 && idx % 5 === 0
        const status: AttendanceStatus = isLate ? 'LATE' : 'PRESENT'

        attendanceCreates.push(
          prisma.attendance.create({
            data: {
              employeeId: emp.id,
              attendanceDate,
              checkInTime: addHours(attendanceDate, isLate ? 9 : 8), // 08:00 or 09:00
              checkOutTime: addHours(attendanceDate, 17),
              status,
              isLate,
              minutesLate: isLate ? 60 : 0,
              roundedMinutesLate: isLate ? 60 : 0,
            },
          })
        )
      })
    }

    await prisma.$transaction(attendanceCreates)
  })

  test.afterAll(async () => {
    // Clean up seeded data (optional if you use a disposable test DB)
    await prisma.attendance.deleteMany()
    await prisma.employee.deleteMany()
    await prisma.shift.deleteMany()
    await prisma.user.deleteMany()
    await prisma.subDepartment.deleteMany()
    await prisma.department.deleteMany()

    await prisma.$disconnect()
  })

  // Helper to aggregate attendance for stats & chart
  type ChartPoint = {
    date: string
    day: string
    present: number
    late: number
    punctual: number
    absent: number
    attendanceRate: number
    punctualityRate: number
  }

  async function buildChartData(days: number): Promise<ChartPoint[]> {
    const chartArr: ChartPoint[] = []
    const today = startOfDay(new Date())

    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(today, i)

      // Aggregate attendance for the day
      const attendances = await prisma.attendance.findMany({
        where: {
          attendanceDate: {
            gte: date,
            lt: addHours(date, 24),
          },
        },
      })

      const present = attendances.length
      const late = attendances.filter((a) => a.isLate).length
      const punctual = present - late
      const absent = EMPLOYEE_COUNT - present
      const attendanceRate = Math.round((present / EMPLOYEE_COUNT) * 100)
      const punctualityRate = present > 0 ? Math.round((punctual / present) * 100) : 100

      chartArr.push({
        date: format(date, 'yyyy-MM-dd'),
        day: format(date, 'EEE'),
        present,
        late,
        punctual,
        absent,
        attendanceRate,
        punctualityRate,
      })
    }

    return chartArr
  }

  test.beforeEach(async ({ page }: { page: Page }) => {
    // 1. Stub SSE to avoid hanging connections
    await page.addInitScript(() => {
      window.__FORCE_STAY_ON_PAGE__ = true
      window.__sseConnections = ['/api/events/stream']

      // @ts-expect-error – overriding built-in type only for test environment
      window.EventSource = class FakeEventSource {
        constructor() {}
        addEventListener() {}
        close() {}
      }
    })

    // 2. Intercept dashboard analytics request and respond with real DB aggregation
    await page.route('**/api/analytics/dashboard-v2**', async (route: Route) => {
      const url = new URL(route.request().url())
      const days = Number(url.searchParams.get('days') || '7')

      const chartData = await buildChartData(days)

      const lateToday = chartData[chartData.length - 1].late
      const presentToday = chartData[chartData.length - 1].present

      const data = {
        success: true,
        data: {
          activeShift: { id: shiftId, name: 'Regular Shift', shiftType: 'REGULAR', mainWorkStart: null, mainWorkEnd: null },
          stats: {
            totalEmployees: EMPLOYEE_COUNT,
            presentToday,
            lateToday,
            leaveToday: 0,
          },
          filteredStats: null,
          subDepartments: [],
          chartData: {
            punctualityTrend: chartData,
            attendanceTrend: chartData,
          },
          recentActivity: [],
          metadata: {
            timestamp: new Date().toISOString(),
            subDepartmentFilter: null,
            currentTime: new Date().toISOString(),
            currentDay: format(new Date(), 'EEEE'),
          },
        },
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(data),
      })
    })
  })

  // --- ACTUAL UI TESTS ---------------------------------------------------

  async function expectTicks(page: Page, expectedCount: number) {
    const ticks = page.locator('.recharts-cartesian-axis-tick-value')
    await expect(ticks).toHaveCount(expectedCount)
  }

  test('renders correct stats and X-axis ticks using DB data', async ({ page }: { page: Page }) => {
    await page.goto('/dashboard')

    // Wait for stats card to render total employees count
    await page.getByText('Total Karyawan').waitFor()
    await expect(page.getByText(`${EMPLOYEE_COUNT}`)).toBeVisible()

    // Verify default 7-day view – should render 7 ticks
    await expectTicks(page, 7)
  })
}) 