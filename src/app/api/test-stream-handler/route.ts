import { NextRequest } from 'next/server';
import { withSingleResponse, safeResponse, safeErrorResponse } from '@/lib/utils/stream-handler';

// Test endpoint untuk memeriksa stream handler functionality
export const GET = withSingleResponse(async (request: NextRequest) => {
  try {
    const url = new URL(request.url);
    const testType = url.searchParams.get('test') || 'basic';

    switch (testType) {
      case 'basic':
        return safeResponse({ 
          message: 'Stream handler working correctly',
          timestamp: new Date().toISOString(),
          testType: 'basic'
        });

      case 'error':
        // Simulasi error untuk testing error handling
        throw new Error('Simulated error for testing');

      case 'double-response':
        // Test untuk memastikan tidak ada double response
        const firstResponse = safeResponse({ message: 'First response' });
        // Attempt to send second response (should be blocked)
        const secondResponse = safeResponse({ message: 'Second response' });
        console.log('First response created:', !!firstResponse);
        console.log('Second response created:', !!secondResponse);
        return firstResponse;

      case 'stream-error':
        // Simulasi stream error untuk testing
        throw new Error('ERR_STREAM_ALREADY_FINISHED');

      default:
        return safeErrorResponse('Invalid test type', 400);
    }
  } catch (error) {
    console.log('Test endpoint caught error:', error);
    if (String(error).toLowerCase().includes('stream')) {
      return safeResponse({ 
        message: 'Stream error handled gracefully',
        originalError: String(error),
        handledAt: new Date().toISOString()
      });
    }
    return safeErrorResponse('Test error occurred: ' + String(error));
  }
});

export const POST = withSingleResponse(async (request: NextRequest) => {
  try {
    const body = await request.json();
    
    // Simulasi async operation yang mungkin menyebabkan double response
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return safeResponse({
      message: 'POST request handled successfully',
      receivedData: body,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return safeErrorResponse('POST request failed: ' + String(error));
  }
});

// Runtime config - compatible dengan Edge Runtime
export const runtime = 'nodejs'; // Ubah ke 'edge' untuk test Edge Runtime compatibility
