'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error untuk debugging
    console.error('Global error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="text-center space-y-6 max-w-md">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-red-600">Error</h1>
          <h2 className="text-2xl font-semibold">Terjadi Kesalahan</h2>
          <p className="text-muted-foreground">
            Maaf, terjadi kesalahan tidak terduga. 
            Silakan coba lagi atau hubungi administrator jika masalah berlanjut.
          </p>
          {process.env.NODE_ENV === 'development' && (
            <details className="text-left text-sm bg-gray-100 p-4 rounded mt-4">
              <summary className="cursor-pointer font-medium">Detail Error (Development)</summary>
              <pre className="mt-2 text-xs overflow-auto">
                {error.message}
              </pre>
            </details>
          )}
        </div>
        
        <div className="flex gap-4 justify-center">
          <Button onClick={reset}>
            Coba Lagi
          </Button>
          <Button variant="outline" onClick={() => window.location.href = '/'}>
            Ke Halaman Utama
          </Button>
        </div>
      </div>
    </div>
  );
}
