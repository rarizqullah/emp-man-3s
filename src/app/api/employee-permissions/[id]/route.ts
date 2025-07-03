import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// DELETE - Hapus izin/cuti
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    // Cek apakah permission exists
    const existingPermission = await prisma.permission.findUnique({
      where: { id },
      include: {
        user: {
          include: {
            employee: true
          }
        }
      }
    });

    if (!existingPermission) {
      return NextResponse.json(
        { success: false, error: 'Izin/cuti tidak ditemukan' },
        { status: 404 }
      );
    }

    // Hapus permission
    await prisma.permission.delete({
      where: { id }
    });

    const employeeName = existingPermission.user.employee?.employeeId || existingPermission.user.name;
    console.log(`✅ Permission deleted: ${id} for user ${employeeName}`);

    return NextResponse.json({
      success: true,
      message: `Izin/cuti untuk ${employeeName} berhasil dihapus`
    });

  } catch (error) {
    console.error('❌ Error deleting permission:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan saat menghapus izin/cuti' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
