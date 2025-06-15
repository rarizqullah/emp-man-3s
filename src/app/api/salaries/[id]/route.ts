import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { 
  getSalaryById, 
  updatePaymentStatus
} from '@/lib/db/salary.service';
import { PaymentStatus } from '@prisma/client';

// Schema validasi untuk update payment status
const paymentUpdateSchema = z.object({
  paymentStatus: z.enum([PaymentStatus.PAID, PaymentStatus.UNPAID]),
  paymentDate: z.string().optional().transform((val) => val ? new Date(val) : undefined)
});

// GET: Mendapatkan detail gaji berdasarkan ID
export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const salary = await getSalaryById(params.id);
    
    if (!salary) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Data gaji tidak ditemukan' 
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: salary,
      message: 'Detail gaji berhasil diambil'
    });

  } catch (error) {
    console.error('Error fetching salary detail:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Terjadi kesalahan saat mengambil detail gaji',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT: Update payment status
export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const data = await request.json();
    
    // Validasi input
    const validatedData = paymentUpdateSchema.parse(data);
    
    // Pastikan gaji ada
    const existingSalary = await getSalaryById(params.id);
    if (!existingSalary) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Data gaji tidak ditemukan' 
        },
        { status: 404 }
      );
    }
    
    // Update payment status
    const updatedSalary = await updatePaymentStatus(
      params.id, 
      validatedData.paymentStatus, 
      validatedData.paymentDate
    );
    
    return NextResponse.json({
      success: true,
      data: updatedSalary,
      message: `Status pembayaran berhasil diperbarui menjadi ${validatedData.paymentStatus === PaymentStatus.PAID ? 'Dibayar' : 'Belum Dibayar'}`
    });

  } catch (error) {
    console.error('Error updating payment status:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Validasi input gagal', 
          details: error.errors 
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Terjadi kesalahan saat mengupdate status pembayaran',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 