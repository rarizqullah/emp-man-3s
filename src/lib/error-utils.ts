/**
 * Utilitas untuk menangani kesalahan terkait ekstensi browser dan router
 */

/**
 * Memeriksa apakah error berasal dari ekstensi browser
 */
export function isExtensionError(error: unknown): boolean {
  if (!error) return false;
  
  try {
    // Periksa pesan error
    const errorString = error instanceof Error
      ? error.message + (error.stack || '')
      : String(error);
      
    return (
      errorString.includes('chrome-extension://') ||
      errorString.includes('binanceInjectedProvider') ||
      errorString.includes('Cannot read properties of null (reading \'type\')') ||
      // ID ekstensi Binance yang diketahui
      errorString.includes('egjidjbpglichdcondbcbdnbeeppgdph')
    );
  } catch {
    return false;
  }
}

/**
 * Memerika apakah error perlu diabaikan
 */
export function shouldIgnoreError(error: unknown): boolean {
  if (isExtensionError(error)) return true;
  
  // Tambahkan jenis error lain yang perlu diabaikan di sini
  return false;
}

/**
 * Middleware untuk menangkap dan mengatasi error saat memanggil fungsi
 */
export function withErrorHandling<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch (error) {
    console.error('Error ditangkap oleh withErrorHandling:', error);
    
    if (shouldIgnoreError(error)) {
      console.log('Error diabaikan karena berasal dari ekstensi browser');
    } else {
      // Log error yang tidak diabaikan
      console.error('Error tidak diabaikan:', error);
    }
    
    return fallback;
  }
}

/**
 * Wrapper asinkron untuk menangkap dan mengatasi error pada fungsi asinkron
 */
export async function withAsyncErrorHandling<T>(
  fn: () => Promise<T>,
  fallback: T
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.error('Async error ditangkap oleh withAsyncErrorHandling:', error);
    
    if (shouldIgnoreError(error)) {
      console.log('Async error diabaikan karena berasal dari ekstensi browser');
    } else {
      // Log error yang tidak diabaikan
      console.error('Async error tidak diabaikan:', error);
    }
    
    return fallback;
  }
} 