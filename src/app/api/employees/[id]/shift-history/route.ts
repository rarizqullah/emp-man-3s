import { NextRequest, NextResponse } from 'next/server';
import prisma from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";

// GET /api/employees/[id]/shift-history
// Mendapatkan riwayat perubahan shift karyawan
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const employeeId = params.id;
    console.log(`Mengambil riwayat shift karyawan dengan ID: ${employeeId}`);

    // Pastikan employeeId ada
    if (!employeeId) {
      return NextResponse.json(
        { success: false, error: "ID karyawan tidak ditemukan" },
        { status: 400 }
      );
    }

    try {
      // Pastikan koneksi database
      const { ensureDatabaseConnection } = await import('@/lib/db/prisma');
      await ensureDatabaseConnection();
      
      // Ambil riwayat shift
      const shiftHistory = await prisma.shiftHistory.findMany({
        where: { employeeId },
        include: {
          shift: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return NextResponse.json({
        success: true,
        data: shiftHistory
      });
    } catch (dbError) {
      console.error("Database error fetching shift history:", dbError);
      if (isConnectionError(dbError)) {
        return NextResponse.json(
          { 
            success: false, 
            error: "Terjadi kesalahan koneksi database, silakan coba lagi nanti" 
          },
          { status: 503 }
        );
      }
      throw dbError;
    }
  } catch (error: unknown) {
    console.error("Error fetching employee shift history:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { 
        success: false, 
        error: `Terjadi kesalahan saat mengambil riwayat shift karyawan: ${errorMessage}` 
      },
      { status: 500 }
    );
  }
}

// Fungsi untuk mengecek apakah error adalah error koneksi
function isConnectionError(error: unknown): boolean {
  if (!error) return false;
  
  const errorMessage = String(error).toLowerCase();
  return (
    errorMessage.includes('connection') &&
    (errorMessage.includes('reset') || 
     errorMessage.includes('closed') || 
     errorMessage.includes('terminated') ||
     errorMessage.includes('timeout') ||
     errorMessage.includes('could not connect'))
  );
}

// POST /api/employees/[id]/shift-history
// Menambahkan riwayat perubahan shift karyawan
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const employeeId = params.id;
    console.log(`Menambahkan riwayat shift karyawan dengan ID: ${employeeId}`);

    // Pastikan employeeId ada
    if (!employeeId) {
      return NextResponse.json(
        { success: false, error: "ID karyawan tidak ditemukan" },
        { status: 400 }
      );
    }

    // Parse data dari request body
    const data = await request.json();
    console.log("Data riwayat shift yang diterima:", data);

    // Validasi data
    if (!data.shiftId) {
      return NextResponse.json(
        { success: false, error: "Shift ID dibutuhkan" },
        { status: 400 }
      );
    }

    if (!data.effectiveDate) {
      return NextResponse.json(
        { success: false, error: "Tanggal efektif dibutuhkan" },
        { status: 400 }
      );
    }

    try {
      // Pastikan koneksi database
      const { ensureDatabaseConnection } = await import('@/lib/db/prisma');
      await ensureDatabaseConnection();
      
      // Dapatkan shift sebelumnya untuk direkam dalam riwayat
      const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
        include: { shift: true },
      });

      if (!employee) {
        return NextResponse.json(
          { success: false, error: "Karyawan tidak ditemukan" },
          { status: 404 }
        );
      }

      // Format data untuk dibuat di database - sesuai dengan skema ShiftHistory
      const formattedData = {
        employeeId,
        shiftId: data.shiftId,
        startDate: new Date(data.effectiveDate),
        endDate: null,
        notes: data.notes || null,
      };

      // Buat riwayat shift baru
      const newShiftHistory = await prisma.shiftHistory.create({
        data: formattedData,
        include: {
          shift: true,
        },
      });

      console.log("Riwayat shift berhasil ditambahkan:", newShiftHistory);

      // Revalidasi jalur untuk memperbarui UI
      revalidatePath(`/employee/${employeeId}`);
      revalidatePath('/employee');

      return NextResponse.json({
        success: true,
        data: newShiftHistory
      });
    } catch (dbError) {
      console.error("Database error creating shift history:", dbError);
      if (isConnectionError(dbError)) {
        return NextResponse.json(
          { 
            success: false, 
            error: "Terjadi kesalahan koneksi database, silakan coba lagi nanti" 
          },
          { status: 503 }
        );
      }
      throw dbError;
    }
  } catch (error: unknown) {
    console.error("Error creating shift history:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { 
        success: false, 
        error: `Terjadi kesalahan saat membuat riwayat shift: ${errorMessage}` 
      },
      { status: 500 }
    );
  }
} 