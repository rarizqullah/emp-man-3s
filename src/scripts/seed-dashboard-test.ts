import { PrismaClient } from '@prisma/client'
import { subDays, formatISO } from 'date-fns'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding dashboard test data...')

  // 1. Ensure clean slate (optional – comment out in production DB!)
  await prisma.attendance.deleteMany()
  await prisma.employee.deleteMany()
  await prisma.subDepartment.deleteMany()
  await prisma.department.deleteMany()

  // 2. Create Departments and Sub-Departments
  const engineering = await prisma.department.create({ data: { name: 'Engineering' } })
  const engSub = await prisma.subDepartment.create({
    data: { name: 'Backend', departmentId: engineering.id },
  })

  // 3. Create 20 employees
  const employees = await prisma.$transaction(
    [...Array(20)].map((_, idx) =>
      prisma.employee.create({
        data: {
          name: `Employee ${idx + 1}`,
          employeeId: `EMP${String(idx + 1).padStart(3, '0')}`,
          subDepartmentId: engSub.id,
        },
      }),
    ),
  )

  // 4. Insert attendance for last 90 days
  const today = new Date()
  const attendanceRecords = []

  for (let dayOffset = 0; dayOffset < 90; dayOffset++) {
    const date = subDays(today, dayOffset)
    const status = dayOffset % 7 === 0 ? 'ABSENT' : dayOffset % 5 === 0 ? 'LATE' : 'ON_TIME'

    for (const emp of employees) {
      attendanceRecords.push(
        prisma.attendance.create({
          data: {
            employeeId: emp.id,
            date: formatISO(date, { representation: 'date' }),
            status,
            checkIn: new Date(date.setHours(8, 0, 0, 0)),
            checkOut: new Date(date.setHours(17, 0, 0, 0)),
          },
        }),
      )
    }
  }

  await prisma.$transaction(attendanceRecords)

  console.log(`✅ Seeded ${employees.length} employees with attendance for 90 days.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 