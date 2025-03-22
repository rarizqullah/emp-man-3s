import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";

// PUT /api/employees/[id]/shift-status
// Mengubah status shift karyawan
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const employeeId = params.id;
    console.log(`Mengubah shift karyawan dengan ID: ${employeeId}`);

    // Pastikan employeeId ada
    if (!employeeId) {
      return NextResponse.json(
        { message: "ID karyawan tidak ditemukan" },
        { status: 400 }
      );
    }

    // Parse data dari request body
    const data = await request.json();
    console.log("Data shift yang diterima:", data);

    // Validasi data
    if (!data.shiftId) {
      return NextResponse.json(
        { message: "Shift ID dibutuhkan" },
        { status: 400 }
      );
    }

    // Cek apakah shift ada
    const shift = await prisma.shift.findUnique({
      where: { id: data.shiftId },
    });

    if (!shift) {
      return NextResponse.json(
        { message: "Shift tidak ditemukan" },
        { status: 404 }
      );
    }

    // Update shift karyawan
    const updatedEmployee = await prisma.employee.update({
      where: { id: employeeId },
      data: { shiftId: data.shiftId },
      include: {
        user: true,
        department: true,
        subDepartment: true,
        position: true,
        shift: true,
      },
    });

    console.log("Shift karyawan berhasil diperbarui:", updatedEmployee);

    // Revalidasi jalur untuk memperbarui UI
    revalidatePath(`/employee/${employeeId}`);
    revalidatePath('/employee');

    return NextResponse.json({
      success: true,
      data: updatedEmployee
    });
  } catch (error) {
    console.error("Error updating employee shift:", error);
    const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan";
    return NextResponse.json(
      { message: `Terjadi kesalahan saat memperbarui shift karyawan: ${errorMessage}` },
      { status: 500 }
    );
  }
} 