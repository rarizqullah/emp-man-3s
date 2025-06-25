import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST() {
  try {
    console.log('=== Fix Shift Configuration ===');
    
    // Find shift "Shift Pagi"
    const shiftPagi = await prisma.shift.findFirst({
      where: {
        name: "Shift Pagi"
      }
    });

    if (!shiftPagi) {
      return NextResponse.json({
        success: false,
        error: 'Shift Pagi not found'
      }, { status: 404 });
    }

    // Update dengan konfigurasi yang realistis untuk Shift Pagi
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const updatedShift = await prisma.shift.update({
      where: { id: shiftPagi.id },
      data: {
        // Jam kerja pagi: 07:00 - 15:00
        mainWorkStart: new Date(today.getTime() + 7 * 60 * 60 * 1000), // 07:00
        mainWorkEnd: new Date(today.getTime() + 15 * 60 * 60 * 1000),   // 15:00
        
        // Jam istirahat: 12:00 - 13:00
        lunchBreakStart: new Date(today.getTime() + 12 * 60 * 60 * 1000), // 12:00
        lunchBreakEnd: new Date(today.getTime() + 13 * 60 * 60 * 1000),   // 13:00
        
        // Jam lembur: 15:00 - 17:00
        regularOvertimeStart: new Date(today.getTime() + 15 * 60 * 60 * 1000), // 15:00
        regularOvertimeEnd: new Date(today.getTime() + 17 * 60 * 60 * 1000),   // 17:00
        
        // Working days
        workingDays: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"]
      }
    });

    console.log('Shift Pagi updated successfully:', {
      mainWorkStart: updatedShift.mainWorkStart,
      mainWorkEnd: updatedShift.mainWorkEnd,
      lunchBreakStart: updatedShift.lunchBreakStart,
      lunchBreakEnd: updatedShift.lunchBreakEnd,
      regularOvertimeStart: updatedShift.regularOvertimeStart,
      regularOvertimeEnd: updatedShift.regularOvertimeEnd
    });

    return NextResponse.json({
      success: true,
      message: 'Shift Pagi configuration updated successfully',
      data: {
        id: updatedShift.id,
        name: updatedShift.name,
        mainWorkStart: updatedShift.mainWorkStart,
        mainWorkEnd: updatedShift.mainWorkEnd,
        lunchBreakStart: updatedShift.lunchBreakStart,
        lunchBreakEnd: updatedShift.lunchBreakEnd,
        regularOvertimeStart: updatedShift.regularOvertimeStart,
        regularOvertimeEnd: updatedShift.regularOvertimeEnd,
        workingDays: updatedShift.workingDays
      }
    });

  } catch (error) {
    console.error('Error fixing shift config:', error);
    return NextResponse.json({
      success: false,
      error: 'Error fixing shift configuration',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 