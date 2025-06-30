"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from 'next/link';
import { Loader2 } from "lucide-react";
import { useSupabase } from "@/providers/supabase-provider";

export default function HomePage() {
  const router = useRouter();
  const { user, isLoading } = useSupabase();
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const redirectUser = () => {
      try {
        // Jika proses autentikasi selesai
        if (!isLoading) {
          // Jika user sudah login, arahkan ke dashboard
          if (user) {
            try {
              router.push('/dashboard');
            } catch (routerError) {
              console.error('Router navigation error:', routerError);
              // Fallback jika router.push gagal
              window.location.href = '/dashboard';
            }
          } else {
            // Jika user belum login, arahkan ke halaman login
            try {
              router.push('/login');
            } catch (routerError) {
              console.error('Router navigation error:', routerError);
              // Fallback jika router.push gagal
              window.location.href = '/login';
            }
          }
        }
      } catch (err) {
        console.error('Error redirecting user:', err);
        setError('Terjadi kesalahan saat mengalihkan halaman.');
        setChecking(false);
      }
    };

    redirectUser();
  }, [user, isLoading, router]);

  // Tampilkan pesan error jika ada
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <h1 className="text-3xl font-bold">Error</h1>
          <p className="text-red-500">{error}</p>
          <div className="mt-4">
            <Link 
              href="/login"
              className="px-4 py-2 bg-blue-600 text-white rounded-md"
            >
              Coba Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Tampilkan loader saat masih mengecek status autentikasi
  if (isLoading || checking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <h1 className="text-3xl font-bold">Employee Management System</h1>
          <p className="text-muted-foreground">Memuat...</p>
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // Fallback return - seharusnya tidak pernah mencapai ini
  // karena semua logic redirect sudah ditangani di useEffect
  // Tampilkan loader sebagai fallback jika ada edge case
  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-3xl font-bold">Employee Management System</h1>
        <p className="text-muted-foreground">Mengarahkan...</p>
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    </div>
  );
}
