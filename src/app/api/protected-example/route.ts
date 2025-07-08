import { NextRequest, NextResponse } from 'next/server';
import { withSingleResponse, safeErrorResponse } from '@/lib/utils/stream-handler';

// Contoh implementasi API route yang aman dari stream errors
export const GET = withSingleResponse(async (request: NextRequest) => {
  try {
    // Your logic here
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }
    
    // Simulate async operation
    const data = await simulateAsyncOperation(id);
    
    return NextResponse.json({ 
      success: true, 
      data 
    });
    
  } catch (error) {
    console.error('Error in protected route:', error);
    return safeErrorResponse('Internal server error', 500);
  }
});

// Contoh POST handler yang aman
export const POST = withSingleResponse(async (request: NextRequest) => {
  try {
    const body = await request.json();
    
    // Validasi
    if (!body.requiredField) {
      return NextResponse.json({ error: 'Required field missing' }, { status: 400 });
    }
    
    // Process data
    const result = await processData(body);
    
    return NextResponse.json({ 
      success: true, 
      result 
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error in POST handler:', error);
    return safeErrorResponse('Failed to process request', 500);
  }
});

// Helper functions
async function simulateAsyncOperation(id: string) {
  // Simulate database operation
  await new Promise(resolve => setTimeout(resolve, 100));
  return { id, name: `Item ${id}`, timestamp: new Date().toISOString() };
}

async function processData(data: Record<string, unknown>) {
  // Simulate processing
  await new Promise(resolve => setTimeout(resolve, 50));
  return { processed: true, originalData: data };
}
