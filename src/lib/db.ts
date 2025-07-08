// Re-export prisma instance dari connection.ts untuk optimized performance
import { prisma, checkDatabaseHealth, disconnectDatabase, getDatabaseStats } from '@/lib/db/connection';

export { prisma, checkDatabaseHealth, disconnectDatabase, getDatabaseStats };

// Backward compatibility
export const ensureDatabaseConnection = checkDatabaseHealth; 