import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET - Mengambil detail grup rotasi berdasarkan ID
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const rotationGroup = await prisma.shiftRotationGroup.findUnique({
      where: { id: params.id },
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
        }
      }
    })

    if (!rotationGroup) {
      return NextResponse.json(
        { error: 'Grup rotasi tidak ditemukan' },
        { status: 404 }
      )
    }

    return NextResponse.json(rotationGroup)
  } catch (error) {
    console.error('Error fetching rotation group:', error)
    return NextResponse.json(
      { error: 'Gagal mengambil data grup rotasi' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

// PUT - Update grup rotasi
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { 
      name, 
      description, 
      subDepartmentId, 
      shiftAId, 
      shiftBId, 
      anchorDate,
      isActive,
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

    // Cek apakah grup rotasi ada
    const existingGroup = await prisma.shiftRotationGroup.findUnique({
      where: { id: params.id }
    })

    if (!existingGroup) {
      return NextResponse.json(
        { error: 'Grup rotasi tidak ditemukan' },
        { status: 404 }
      )
    }

    // Cek apakah shift sudah digunakan dalam grup rotasi lain yang aktif (kecuali grup ini sendiri)
    const conflictingGroups = await prisma.shiftRotationGroup.findMany({
      where: {
        AND: [
          { id: { not: params.id } },
          {
            OR: [
              { shiftAId: shiftAId },
              { shiftBId: shiftBId },
              { shiftAId: shiftBId },
              { shiftBId: shiftAId }
            ]
          },
          { isActive: true }
        ]
      }
    })

    if (conflictingGroups.length > 0) {
      return NextResponse.json(
        { error: 'Salah satu shift sudah digunakan dalam grup rotasi yang aktif' },
        { status: 400 }
      )
    }

    // Update grup rotasi dalam transaksi
    const updatedGroup = await prisma.$transaction(async (tx) => {
      // Update grup rotasi
      const updated = await tx.shiftRotationGroup.update({
        where: { id: params.id },
        data: {
          name,
          description,
          subDepartmentId: subDepartmentId || null,
          shiftAId,
          shiftBId,
          anchorDate: new Date(anchorDate),
          isActive: isActive ?? true
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

      // Update assignment karyawan jika diperlukan
      if (employeeIds !== undefined) {
        // Hapus assignment lama
        await tx.employee.updateMany({
          where: {
            shiftRotationGroupId: params.id
          },
          data: {
            shiftRotationGroupId: null
          }
        })

        // Assign karyawan baru jika ada
        if (employeeIds.length > 0) {
          await tx.employee.updateMany({
            where: {
              id: { in: employeeIds }
            },
            data: {
              shiftRotationGroupId: params.id
            }
          })
        }
      }

      return updated
    })

    return NextResponse.json(updatedGroup)
  } catch (error: unknown) {
    console.error('Error updating rotation group:', error)
    
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Nama grup rotasi sudah digunakan' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Gagal mengupdate grup rotasi' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

// DELETE - Hapus grup rotasi
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Cek apakah grup rotasi ada
    const existingGroup = await prisma.shiftRotationGroup.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            employees: true
          }
        }
      }
    })

    if (!existingGroup) {
      return NextResponse.json(
        { error: 'Grup rotasi tidak ditemukan' },
        { status: 404 }
      )
    }

    // Hapus dalam transaksi
    await prisma.$transaction(async (tx) => {
      // Hapus assignment dari karyawan terlebih dahulu
      await tx.employee.updateMany({
        where: {
          shiftRotationGroupId: params.id
        },
        data: {
          shiftRotationGroupId: null
        }
      })

      // Hapus grup rotasi
      await tx.shiftRotationGroup.delete({
        where: { id: params.id }
      })
    })

    return NextResponse.json({ 
      message: 'Grup rotasi berhasil dihapus',
      employeesAffected: existingGroup._count.employees
    })
  } catch (error) {
    console.error('Error deleting rotation group:', error)
    return NextResponse.json(
      { error: 'Gagal menghapus grup rotasi' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
