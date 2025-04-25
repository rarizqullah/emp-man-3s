// Re-export prisma instance dari file prisma.ts untuk konsistensi di seluruh aplikasi
export { prisma, ensureDatabaseConnection } from '@/lib/db/prisma'; 