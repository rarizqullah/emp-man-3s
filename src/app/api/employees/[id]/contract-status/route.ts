import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";

// PUT /api/employees/[id]/contract-status
// Mengubah status kontrak karyawan
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const employeeId = params.id;
    console.log(`Mengubah kontrak karyawan dengan ID: ${employeeId}`);

    // Pastikan employeeId ada
    if (!employeeId) {
      return NextResponse.json(
        { success: false, error: "ID karyawan tidak ditemukan" },
        { status: 400 }
      );
    }

    // Parse data dari request body
    const data = await request.json();
    console.log("Data kontrak yang diterima:", data);

    // Validasi data
    if (!data.contractType) {
      return NextResponse.json(
        { success: false, error: "Tipe kontrak dibutuhkan" },
        { status: 400 }
      );
    }

    // Dapatkan data karyawan yang ada
    const existingEmployee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!existingEmployee) {
      return NextResponse.json(
        { success: false, error: "Karyawan tidak ditemukan" },
        { status: 404 }
      );
    }

    // Nonaktifkan kontrak yang sedang aktif (jika ada)
    // dengan menambahkan endDate ke riwayat kontrak aktif
    await prisma.contractHistory.updateMany({
      where: { 
        employeeId: employeeId,
        endDate: null,
        status: "ACTIVE"
      },
      data: { 
        endDate: new Date(),
        status: "INACTIVE"
      }
    });

    // 1. Update kontrak karyawan
    const updatedEmployee = await prisma.employee.update({
      where: { id: employeeId },
      data: {
        contractType: data.contractType,
        contractNumber: data.contractNumber,
        contractStartDate: data.startDate ? new Date(data.startDate) : undefined,
        contractEndDate: data.endDate ? new Date(data.endDate) : null
      },
      include: {
        user: true,
        department: true,
        subDepartment: true,
        position: true,
        shift: true,
      },
    });

    // 2. Catat riwayat kontrak
    const contractHistory = await prisma.contractHistory.create({
      data: {
        employeeId,
        contractType: data.contractType,
        contractNumber: data.contractNumber,
        startDate: data.startDate ? new Date(data.startDate) : new Date(),
        endDate: data.endDate ? new Date(data.endDate) : null,
        status: "ACTIVE", // Selalu set sebagai ACTIVE untuk kontrak baru
        notes: data.notes || `Perubahan kontrak menjadi ${data.contractType === "PERMANENT" ? "Permanen" : "Training"}`
      }
    });

    console.log("Kontrak karyawan berhasil diperbarui:", updatedEmployee);
    console.log("Riwayat kontrak berhasil dicatat:", contractHistory);

    // Revalidasi jalur untuk memperbarui UI
    revalidatePath(`/employee/${employeeId}`);
    revalidatePath('/employee');

    return NextResponse.json({
      success: true,
      data: updatedEmployee,
      history: contractHistory
    });
  } catch (error) {
    console.error("Error updating employee contract:", error);
    const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan";
    return NextResponse.json(
      { success: false, error: `Terjadi kesalahan saat memperbarui kontrak karyawan: ${errorMessage}` },
      { status: 500 }
    );
  }
} 