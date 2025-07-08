import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { employeeIds, shiftId, effectiveDate, notes } = body;

    // Validasi input
    if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      return NextResponse.json(
        { error: 'Employee IDs are required and must be an array' },
        { status: 400 }
      );
    }

    if (!shiftId) {
      return NextResponse.json(
        { error: 'Shift ID is required' },
        { status: 400 }
      );
    }

    if (!effectiveDate) {
      return NextResponse.json(
        { error: 'Effective date is required' },
        { status: 400 }
      );
    }

    // Validasi shift exists
    const shift = await prisma.shift.findUnique({
      where: { id: shiftId }
    });

    if (!shift) {
      return NextResponse.json(
        { error: 'Shift not found' },
        { status: 404 }
      );
    }

    // Validasi employees exist
    const employees = await prisma.employee.findMany({
      where: { id: { in: employeeIds } },
      include: {
        user: { select: { name: true } },
        shift: { select: { name: true } }
      }
    });

    if (employees.length !== employeeIds.length) {
      return NextResponse.json(
        { error: 'Some employees not found' },
        { status: 404 }
      );
    }

    const effectiveDateObj = new Date(effectiveDate);

    // Bulk update employees and create shift history
    const results = await Promise.all(
      employees.map(async (employee) => {
        // Update employee shift
        await prisma.employee.update({
          where: { id: employee.id },
          data: { shiftId: shiftId }
        });

        // Create shift history record
        const shiftHistory = await prisma.shiftHistory.create({
          data: {
            employeeId: employee.id,
            shiftId: shiftId,
            startDate: effectiveDateObj,
            notes: notes || `Bulk shift change from ${employee.shift.name} to ${shift.name}`
          }
        });

        return {
          employeeId: employee.id,
          employeeName: employee.user.name,
          previousShift: employee.shift.name,
          newShift: shift.name,
          shiftHistoryId: shiftHistory.id
        };
      })
    );

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${results.length} employees`,
      results
    });

  } catch (error) {
    console.error('Error in bulk shift change:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 