'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function AuthFallback() {
  useEffect(() => {
    // Log error untuk debugging
    console.error('Terdeteksi loop redirect atau masalah otentikasi');
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-md">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Masalah Otentikasi</h1>
          <p className="mt-2 text-gray-600">
            Terjadi masalah dengan sesi otentikasi Anda. Ini mungkin disebabkan oleh:
          </p>
          <ul className="mt-4 text-left text-sm text-gray-600">
            <li className="mb-1">• Cookie browser yang diblokir</li>
            <li className="mb-1">• Sesi yang kedaluwarsa</li>
            <li className="mb-1">• Masalah pada server otentikasi</li>
          </ul>
        </div>
        
        <div className="mt-6 space-y-4">
          <Button asChild className="w-full">
            <Link href="/login">
              Kembali ke Halaman Login
            </Link>
          </Button>
          
          <p className="text-center text-sm text-gray-500">
            Jika masalah berlanjut, silakan hubungi administrator sistem.
          </p>
        </div>
      </div>
    </div>
  );
} 