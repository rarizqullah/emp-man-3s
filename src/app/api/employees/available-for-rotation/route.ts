import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET - Mendapatkan daftar karyawan yang bisa ditambahkan ke grup rotasi
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const subDepartmentId = searchParams.get('subDepartmentId')
    const excludeGroupId = searchParams.get('excludeGroupId') // untuk exclude grup yang sedang diedit

    // Build query conditions
    const whereConditions: {
      deletedAt: null
      shiftRotationGroupId: null
      subDepartmentId?: string
    } = {
      deletedAt: null, // hanya karyawan aktif
      shiftRotationGroupId: null // belum tergabung dalam grup rotasi
    }

    if (subDepartmentId && subDepartmentId !== 'ALL') {
      whereConditions.subDepartmentId = subDepartmentId
    }

    const employees = await prisma.employee.findMany({
      where: whereConditions,
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        shift: {
          select: {
            name: true,
            shiftType: true
          }
        },
        subDepartment: {
          include: {
            department: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: [
        { subDepartmentId: 'asc' },
        { user: { name: 'asc' } }
      ]
    })

    // Jika ada excludeGroupId, tambahkan juga karyawan dari grup tersebut
    if (excludeGroupId) {
      const groupEmployees = await prisma.employee.findMany({
        where: {
          shiftRotationGroupId: excludeGroupId,
          deletedAt: null
        },
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          },
          shift: {
            select: {
              name: true,
              shiftType: true
            }
          },
          subDepartment: {
            include: {
              department: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      })

      // Gabungkan dengan employees yang available
      const allEmployees = [...employees, ...groupEmployees]
      
      // Sort ulang
      allEmployees.sort((a, b) => {
        if (a.subDepartmentId === b.subDepartmentId) {
          return (a.user?.name || '').localeCompare(b.user?.name || '')
        }
        return (a.subDepartmentId || '').localeCompare(b.subDepartmentId || '')
      })

      return NextResponse.json(allEmployees)
    }

    return NextResponse.json(employees)
  } catch (error) {
    console.error('Error fetching available employees:', error)
    return NextResponse.json(
      { error: 'Gagal mengambil data karyawan' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
