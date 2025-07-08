// Global error handler untuk menangkap stream errors - Edge Runtime compatible
import { suppressStreamErrors } from '@/lib/utils/stream-handler';

// Global flag to prevent multiple initialization across all imports
declare global {
  // eslint-disable-next-line no-var
  var __GLOBAL_ERROR_HANDLER_INITIALIZED__: boolean | undefined;
}

// Prevent multiple initialization using global flag
if (!globalThis.__GLOBAL_ERROR_HANDLER_INITIALIZED__) {
  // Initialize stream error suppression (Edge Runtime safe)
  suppressStreamErrors();
  
  // Set global flag to prevent re-initialization
  globalThis.__GLOBAL_ERROR_HANDLER_INITIALIZED__ = true;
  
  // Only log once during the entire application lifecycle
  console.info('🔧 Global error handler initialized (Edge Runtime compatible)');
}

export {};
