// Node.js specific error handler - tidak untuk Edge Runtime/Middleware
// Hanya digunakan di API routes yang berjalan di Node.js runtime

// Enhanced error handling untuk Node.js runtime only
export function initializeNodeErrorHandling() {
  if (typeof window === 'undefined' && typeof process !== 'undefined') {
    // Check if we're truly in Node.js runtime
    const isNodeRuntime = !process.env.NEXT_RUNTIME || process.env.NEXT_RUNTIME === 'nodejs';
    
    if (isNodeRuntime && process.on && typeof process.on === 'function') {
      try {
        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
          const errorMessage = String(reason).toLowerCase();
          if (
            errorMessage.includes('stream is already ended') ||
            errorMessage.includes('err_stream_already_finished') ||
            errorMessage.includes('failed to pipe response')
          ) {
            console.warn('🔧 Node.js: Unhandled stream rejection suppressed:', reason);
            return;
          }
          console.error('Unhandled Rejection at:', promise, 'reason:', reason);
        });

        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
          const errorMessage = String(error).toLowerCase();
          if (
            errorMessage.includes('stream is already ended') ||
            errorMessage.includes('err_stream_already_finished') ||
            errorMessage.includes('failed to pipe response')
          ) {
            console.warn('🔧 Node.js: Uncaught stream error suppressed:', error.message);
            return;
          }
          // Re-throw non-stream errors
          throw error;
        });

        console.warn('🔧 Node.js error handling initialized');
      } catch (error) {
        console.warn('⚠️ Failed to initialize Node.js error handling:', error);
      }
    }
  }
}

// Auto-initialize if we're in a safe Node.js environment
if (typeof process !== 'undefined' && !process.env.NEXT_RUNTIME) {
  initializeNodeErrorHandling();
}
