"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/providers/supabase-provider";
import { Loader2 } from "lucide-react";

interface PermissionPageGuardProps {
  children: React.ReactNode;
}

export default function PermissionPageGuard({ children }: PermissionPageGuardProps) {
  const { user, isLoading } = useSupabase();
  const [isCheckingPermission, setIsCheckingPermission] = useState<boolean>(true);
  const router = useRouter();

  useEffect(() => {
    // Fungsi untuk mengecek izin pengguna
    const checkUserPermission = async () => {
      try {
        console.log("[PermissionPageGuard] Memulai pengecekan izin");
        
        // Atur flag untuk mencegah redirect otomatis ke halaman login
        if (typeof window !== 'undefined') {
          window.__FORCE_STAY_ON_PAGE__ = true;
          console.log("[PermissionPageGuard] Flag __FORCE_STAY_ON_PAGE__ disetel");
        }
        
        // Jika masih loading, tunggu
        if (isLoading) {
          console.log("[PermissionPageGuard] Auth masih loading, menunggu");
          return;
        }
        
        // Izinkan akses untuk semua pengguna
        console.log("[PermissionPageGuard] Memberikan akses ke halaman permission");
        setIsCheckingPermission(false);
        
        // Hanya log info jika ada user
        if (user) {
          console.log("[PermissionPageGuard] User terautentikasi:", user.email);
          console.log("[PermissionPageGuard] Metadata:", user.user_metadata);
        } else {
          console.log("[PermissionPageGuard] Tidak ada user, tetap memberikan akses");
        }
      } catch (error) {
        console.error("Error checking permission:", error);
        // Tetap berikan akses meskipun ada error
        console.log("[PermissionPageGuard] Terjadi error, tetap memberikan akses");
        setIsCheckingPermission(false);
      }
    };

    checkUserPermission();
  }, [user, isLoading, router]);

  // Jika sedang memeriksa izin, tampilkan loading
  if (isCheckingPermission) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Memeriksa izin akses...</p>
      </div>
    );
  }

  // Izinkan semua pengguna mengakses
  return <>{children}</>;
} 