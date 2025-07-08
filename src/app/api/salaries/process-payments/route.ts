import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { processPayments } from '@/lib/db/salary.service';

// Schema validasi untuk proses pembayaran massal
const processPaymentsSchema = z.object({
  salaryIds: z.array(z.string().uuid()).min(1, 'Pilih minimal satu gaji untuk diproses'),
  paymentDate: z.string().optional().transform((val) => val ? new Date(val) : new Date()),
  paymentMethod: z.enum(['TRANSFER', 'CASH']).optional(),
  notes: z.string().optional()
});

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validasi input
    const validatedData = processPaymentsSchema.parse(data);
    
    console.log(`Processing payments for ${validatedData.salaryIds.length} salaries`);
    
    // Proses pembayaran untuk semua gaji yang dipilih
    const result = await processPayments(
      validatedData.salaryIds, 
      validatedData.paymentDate
    );
    
    return NextResponse.json({
      success: true,
      data: {
        processedCount: result.count,
        paymentDate: validatedData.paymentDate,
        paymentMethod: validatedData.paymentMethod || 'TRANSFER',
        notes: validatedData.notes
      },
      message: `Berhasil memproses pembayaran untuk ${result.count} gaji`
    });

  } catch (error) {
    console.error('Error processing payments:', error);
    
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
        error: 'Terjadi kesalahan saat memproses pembayaran',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 