import { PrismaClient } from '@prisma/client';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
// https://www.prisma.io/docs/guides/other/troubleshooting-orm/help-articles/nextjs-prisma-client-dev-practices

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Fungsi untuk membuat instance Prisma dengan penanganan error
function createPrismaClient() {
  const client = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
  });

  // Menangani event untuk debugging
  if (process.env.NODE_ENV !== 'production') {
    client.$use(async (params, next) => {
      console.log('Query dijalankan:', params);
      return next(params);
    });
  }

  return client;
}

// Fungsi untuk mencoba ulang koneksi jika gagal
async function connectWithRetry(maxRetries = 5, delay = 5000) {
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      // Test koneksi dengan query sederhana
      await prisma.$queryRaw`SELECT 1 as result`;
      console.log('Berhasil terhubung ke database');
      return true;
    } catch (error) {
      retries++;
      console.error(`Gagal terhubung ke database (percobaan ${retries}/${maxRetries}):`, error);
      
      if (retries >= maxRetries) {
        console.error('Batas percobaan koneksi tercapai. Tidak dapat terhubung ke database.');
        return false;
      }
      
      // Tunggu sebelum mencoba lagi
      console.log(`Mencoba ulang dalam ${delay/1000} detik...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return false;
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

// Fungsi yang dapat digunakan untuk memastikan koneksi database sebelum operasi penting
export async function ensureDatabaseConnection() {
  try {
    await prisma.$queryRaw`SELECT 1 as result`;
    return true;
  } catch (error) {
    console.error('Kesalahan koneksi database:', error);
    return connectWithRetry();
  }
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma; 