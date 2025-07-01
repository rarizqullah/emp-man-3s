import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
// import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Remove auth check temporarily for testing - same as main employees API
    // TODO: Implement proper auth later if needed

    const employeeId = params.id;

    // Check if employee exists and is archived
    const employee = await prisma.employee.findFirst({
      where: {
        id: employeeId,
        deletedAt: {
          not: null
        }
      }
    });

    if (!employee) {
      return NextResponse.json(
        { error: 'Karyawan tidak ditemukan atau tidak diarsipkan' },
        { status: 404 }
      );
    }

    // Restore employee (remove soft delete)
    const restoredEmployee = await prisma.employee.update({
      where: {
        id: employeeId
      },
      data: {
        deletedAt: null,
        deletedBy: null,
        deletionReason: null
      }
    });

    return NextResponse.json({
      message: 'Karyawan berhasil dipulihkan',
      employee: restoredEmployee
    });
  } catch (error) {
    console.error('Error restoring employee:', error);
    return NextResponse.json(
      { error: 'Gagal memulihkan karyawan' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Remove auth check temporarily for testing - same as main employees API
    // TODO: Implement proper auth later if needed

    const employeeId = params.id;

    // Check if employee exists and is archived
    const employee = await prisma.employee.findFirst({
      where: {
        id: employeeId,
        deletedAt: {
          not: null
        }
      },
      include: {
        user: true
      }
    });

    if (!employee) {
      return NextResponse.json(
        { error: 'Karyawan tidak ditemukan atau tidak diarsipkan' },
        { status: 404 }
      );
    }

    // Permanently delete employee and associated user
    await prisma.$transaction(async (tx) => {
      // Delete employee first (due to foreign key constraints)
      await tx.employee.delete({
        where: { id: employeeId }
      });

      // Delete associated user
      await tx.user.delete({
        where: { id: employee.userId }
      });
    });

    return NextResponse.json({
      message: 'Karyawan berhasil dihapus permanen'
    });
  } catch (error) {
    console.error('Error permanently deleting employee:', error);
    return NextResponse.json(
      { error: 'Gagal menghapus permanen karyawan' },
      { status: 500 }
    );
  }
}
