// Re-export prisma instance dari connection.ts untuk optimized performance
import { prisma, checkDatabaseHealth, disconnectDatabase, getDatabaseStats, safeQuery } from '@/lib/db/connection';

export { prisma, checkDatabaseHealth, disconnectDatabase, getDatabaseStats, safeQuery };

// Backward compatibility
export const ensureDatabaseConnection = checkDatabaseHealth; 