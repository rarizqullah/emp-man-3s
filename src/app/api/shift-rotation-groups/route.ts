import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET - Mengambil semua grup rotasi
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const subDepartmentId = searchParams.get('subDepartmentId')

    // Build query conditions
    const whereConditions: { subDepartmentId?: string } = {}
    
    if (subDepartmentId && subDepartmentId !== 'ALL') {
      whereConditions.subDepartmentId = subDepartmentId
    }

    const rotationGroups = await prisma.shiftRotationGroup.findMany({
      where: whereConditions,
      include: {
        shiftA: {
          select: {
            id: true,
            name: true,
            shiftType: true,
            mainWorkStart: true,
            mainWorkEnd: true,
          }
        },
        shiftB: {
          select: {
            id: true,
            name: true,
            shiftType: true,
            mainWorkStart: true,
            mainWorkEnd: true,
          }
        },
        subDepartment: {
          include: {
            department: {
              select: {
                id: true,
                name: true,
              }
            }
          }
        },
        employees: {
          select: {
            id: true,
            employeeId: true,
            user: {
              select: {
                name: true,
              }
            }
          }
        },
        _count: {
          select: {
            employees: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(rotationGroups)
  } catch (error) {
    console.error('Error fetching rotation groups:', error)
    return NextResponse.json(
      { error: 'Gagal mengambil data grup rotasi' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

// POST - Membuat grup rotasi baru
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { 
      name, 
      description, 
      subDepartmentId, 
      shiftAId, 
      shiftBId, 
      anchorDate,
      employeeIds 
    } = body

    // Validasi input
    if (!name || !shiftAId || !shiftBId || !anchorDate) {
      return NextResponse.json(
        { error: 'Nama, Shift A, Shift B, dan tanggal mulai wajib diisi' },
        { status: 400 }
      )
    }

    // Validasi bahwa shift A dan B berbeda
    if (shiftAId === shiftBId) {
      return NextResponse.json(
        { error: 'Shift A dan Shift B harus berbeda' },
        { status: 400 }
      )
    }

    // Cek apakah shift sudah digunakan dalam grup rotasi lain yang aktif
    const existingGroups = await prisma.shiftRotationGroup.findMany({
      where: {
        OR: [
          { shiftAId: shiftAId },
          { shiftBId: shiftBId },
          { shiftAId: shiftBId },
          { shiftBId: shiftAId }
        ],
        isActive: true
      }
    })

    if (existingGroups.length > 0) {
      return NextResponse.json(
        { error: 'Salah satu shift sudah digunakan dalam grup rotasi yang aktif' },
        { status: 400 }
      )
    }

    // Validasi tanggal anchor tidak di masa depan
    const anchorDateObj = new Date(anchorDate)
    if (anchorDateObj > new Date()) {
      return NextResponse.json(
        { error: 'Tanggal mulai tidak boleh di masa depan' },
        { status: 400 }
      )
    }

    // Buat grup rotasi dalam transaksi
    const rotationGroup = await prisma.$transaction(async (tx) => {
      // Buat grup rotasi
      const newGroup = await tx.shiftRotationGroup.create({
        data: {
          name,
          description,
          subDepartmentId: subDepartmentId || null,
          shiftAId,
          shiftBId,
          anchorDate: anchorDateObj,
          isActive: true
        },
        include: {
          shiftA: true,
          shiftB: true,
          subDepartment: {
            include: {
              department: true
            }
          }
        }
      })

      // Jika ada employee yang dipilih, assign mereka ke grup rotasi
      if (employeeIds && employeeIds.length > 0) {
        await tx.employee.updateMany({
          where: {
            id: { in: employeeIds }
          },
          data: {
            shiftRotationGroupId: newGroup.id
          }
        })
      }

      return newGroup
    })

    return NextResponse.json(rotationGroup, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating rotation group:', error)
    
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Nama grup rotasi sudah digunakan' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Gagal membuat grup rotasi' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
