import { prisma } from '@/lib/db';
import { ContractType, WarningStatus, Prisma } from '@prisma/client';

// Define tipe data untuk update
type ContractHistoryUpdateInput = Prisma.ContractHistoryUpdateInput;
type ShiftHistoryUpdateInput = Prisma.ShiftHistoryUpdateInput;
type WarningHistoryUpdateInput = Prisma.WarningHistoryUpdateInput;

// ==================== CONTRACT HISTORY ====================
export async function getContractHistoryByEmployeeId(employeeId: string) {
  try {
    const contractHistory = await prisma.contractHistory.findMany({
      where: {
        employeeId: employeeId
      },
      orderBy: {
        startDate: 'desc'
      }
    });
    
    return contractHistory;
  } catch (error) {
    console.error('Error getting contract history:', error);
    throw error;
  }
}

export async function createContractHistory(data: {
  employee: { connect: { id: string } };
  contractType: string;
  contractNumber?: string | null;
  startDate: Date;
  endDate?: Date | null;
  status: string;
  notes?: string | null;
}) {
  try {
    const newContractHistory = await prisma.contractHistory.create({
      data: {
        employee: {
          connect: { id: data.employee.connect.id }
        },
        contractType: data.contractType as ContractType,
        contractNumber: data.contractNumber,
        startDate: data.startDate,
        endDate: data.endDate,
        status: data.status,
        notes: data.notes
      }
    });
    
    return newContractHistory;
  } catch (error) {
    console.error('Error creating contract history:', error);
    throw error;
  }
}

// ==================== SHIFT HISTORY ====================
export async function getShiftHistoryByEmployeeId(employeeId: string) {
  try {
    const shiftHistory = await prisma.shiftHistory.findMany({
      where: {
        employeeId: employeeId
      },
      include: {
        shift: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        startDate: 'desc'
      }
    });
    
    return shiftHistory;
  } catch (error) {
    console.error('Error getting shift history:', error);
    throw error;
  }
}

export async function createShiftHistory(data: {
  employee: { connect: { id: string } };
  shift: { connect: { id: string } };
  startDate: Date;
  endDate?: Date | null;
  notes?: string | null;
}) {
  try {
    const newShiftHistory = await prisma.shiftHistory.create({
      data: {
        employee: {
          connect: { id: data.employee.connect.id }
        },
        shift: {
          connect: { id: data.shift.connect.id }
        },
        startDate: data.startDate,
        endDate: data.endDate,
        notes: data.notes
      },
      include: {
        shift: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    return newShiftHistory;
  } catch (error) {
    console.error('Error creating shift history:', error);
    throw error;
  }
}

// ==================== WARNING HISTORY ====================
export async function getWarningHistoryByEmployeeId(employeeId: string) {
  try {
    const warningHistory = await prisma.warningHistory.findMany({
      where: {
        employeeId: employeeId
      },
      orderBy: {
        startDate: 'desc'
      }
    });
    
    return warningHistory;
  } catch (error) {
    console.error('Error getting warning history:', error);
    throw error;
  }
}

export async function createWarningHistory(data: {
  employee: { connect: { id: string } };
  warningStatus: string;
  startDate: Date;
  endDate?: Date | null;
  reason: string;
  attachmentUrl?: string | null;
}) {
  try {
    const newWarningHistory = await prisma.warningHistory.create({
      data: {
        employee: {
          connect: { id: data.employee.connect.id }
        },
        warningStatus: data.warningStatus as WarningStatus,
        startDate: data.startDate,
        endDate: data.endDate,
        reason: data.reason,
        attachmentUrl: data.attachmentUrl
      }
    });
    
    return newWarningHistory;
  } catch (error) {
    console.error('Error creating warning history:', error);
    throw error;
  }
}

// Fungsi-fungsi tambahan - tidak digunakan saat ini
export async function updateContractHistory(id: string, data: ContractHistoryUpdateInput) {
  try {
    const updatedContractHistory = await prisma.contractHistory.update({
      where: { id },
      data
    });
    return updatedContractHistory;
  } catch (error) {
    console.error('Error updating contract history:', error);
    throw error;
  }
}

export async function deleteContractHistory(id: string) {
  try {
    await prisma.contractHistory.delete({
      where: { id }
    });
    return { id };
  } catch (error) {
    console.error('Error deleting contract history:', error);
    throw error;
  }
}

export async function updateShiftHistory(id: string, data: ShiftHistoryUpdateInput) {
  try {
    const updatedShiftHistory = await prisma.shiftHistory.update({
      where: { id },
      data
    });
    return updatedShiftHistory;
  } catch (error) {
    console.error('Error updating shift history:', error);
    throw error;
  }
}

export async function deleteShiftHistory(id: string) {
  try {
    await prisma.shiftHistory.delete({
      where: { id }
    });
    return { id };
  } catch (error) {
    console.error('Error deleting shift history:', error);
    throw error;
  }
}

export async function updateWarningHistory(id: string, data: WarningHistoryUpdateInput) {
  try {
    const updatedWarningHistory = await prisma.warningHistory.update({
      where: { id },
      data
    });
    return updatedWarningHistory;
  } catch (error) {
    console.error('Error updating warning history:', error);
    throw error;
  }
}

export async function deleteWarningHistory(id: string) {
  try {
    await prisma.warningHistory.delete({
      where: { id }
    });
    return { id };
  } catch (error) {
    console.error('Error deleting warning history:', error);
    throw error;
  }
} 