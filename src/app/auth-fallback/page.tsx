'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function AuthFallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect ke halaman login setelah 3 detik
    const timeout = setTimeout(() => {
      router.push('/login');
    }, 3000);

    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="flex flex-col items-center justify-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <h1 className="text-xl font-semibold">Mengalihkan ke halaman login...</h1>
        <p className="text-muted-foreground">
          Sesi anda telah berakhir atau anda tidak memiliki akses
        </p>
      </div>
    </div>
  );
} 