import { PrismaClient } from '@prisma/client';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
// https://www.prisma.io/docs/guides/other/troubleshooting-orm/help-articles/nextjs-prisma-client-dev-practices

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Fungsi untuk membuat instance Prisma dengan penanganan error
function createPrismaClient() {
  const client = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
    errorFormat: 'pretty',
    // Meningkatkan timeout koneksi untuk mengatasi masalah jaringan
    datasources: {
      db: {
        url: process.env.DATABASE_URL || '',
      },
    },
  });

  // Menangani event untuk debugging
  if (process.env.NODE_ENV !== 'production') {
    client.$use(async (params, next) => {
      try {
        const result = await next(params);
        return result;
      } catch (error) {
        console.error('Error dalam transaksi Prisma:', error);
        // Mencoba ulang jika terjadi error koneksi
        if (isConnectionError(error)) {
          console.log('Mencoba menghubungkan kembali...');
          await connectWithRetry();
        }
        throw error;
      }
    });
  }

  return client;
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

// Fungsi untuk mencoba ulang koneksi jika gagal
async function connectWithRetry(maxRetries = 5, delay = 5000) {
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      // Test koneksi dengan query sederhana
      await prisma.$executeRaw`SELECT 1 as result`;
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

// Buat atau ambil instance yang ada
export const prisma = globalForPrisma.prisma || createPrismaClient();

// Fungsi yang dapat digunakan untuk memastikan koneksi database sebelum operasi penting
export async function ensureDatabaseConnection() {
  try {
    // Coba koneksi dengan query sederhana
    await prisma.$executeRaw`SELECT 1 as result`;
    return true;
  } catch (error) {
    console.error('Kesalahan koneksi database:', error);
    return connectWithRetry();
  }
}

// Inisialisasi awal koneksi
(async () => {
  try {
    // Mencoba koneksi saat startup
    await ensureDatabaseConnection();
  } catch (error) {
    console.error('Gagal inisialisasi koneksi database:', error);
  }
})();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma; 