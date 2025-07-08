import { NextRequest, NextResponse } from 'next/server';
import { withSingleResponse, safeErrorResponse } from '@/lib/utils/stream-handler';

// Contoh implementasi dengan wrapper untuk mencegah multiple responses
export const POST = withSingleResponse(async (request: NextRequest) => {
  try {
    const body = await request.json();
    
    // Validasi input
    if (!body.data) {
      // Tidak perlu return karena withSingleResponse akan menangani
      return NextResponse.json({ error: 'Data required' }, { status: 400 });
    }
    
    // Simulasi operasi async
    const result = await processData(body.data);
    
    // Response sukses
    return NextResponse.json({ 
      success: true, 
      result 
    });
    
  } catch (error) {
    // Error akan ditangani oleh wrapper
    console.error('Error processing data:', error);
    return safeErrorResponse('Failed to process data', 500);
  }
});

// Contoh implementasi manual dengan best practices
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    // Early return untuk validasi
    if (!id) {
      return NextResponse.json(
        { error: 'ID parameter is required' }, 
        { status: 400 }
      );
    }
    
    // Cari data
    const data = await findDataById(id);
    
    // Early return jika tidak ditemukan
    if (!data) {
      return NextResponse.json(
        { error: 'Data not found' }, 
        { status: 404 }
      );
    }
    
    // Return data jika ditemukan
    return NextResponse.json({
      success: true,
      data
    });
    
  } catch (error) {
    console.error('Error fetching data:', error);
    // Pastikan selalu ada return statement di catch
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Simulasi functions
async function processData(data: unknown) {
  // Simulate processing
  return { processed: true, data };
}

async function findDataById(id: string) {
  // Simulate database lookup
  return id === 'valid' ? { id, name: 'Sample Data' } : null;
}
