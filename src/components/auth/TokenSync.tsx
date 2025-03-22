"use client";

import { useEffect, useRef } from "react";
import { ensureTokenCookie } from "@/lib/client-auth";

/**
 * Komponen ini memastikan token di localStorage selalu disinkronkan dengan cookie
 * Ini penting agar middleware dapat mengakses token
 */
export default function TokenSync() {
  const syncPerformed = useRef(false);

  useEffect(() => {
    // Hanya jalankan di client-side
    if (typeof window === 'undefined') return;

    if (syncPerformed.current) {
      console.log("[TokenSync] Sinkronisasi sudah dilakukan sebelumnya, lewati");
      return;
    }

    console.log("[TokenSync] Memeriksa token di localStorage untuk sinkronisasi");

    // Dapatkan token dari localStorage
    const token = localStorage.getItem('token');
    if (token) {
      console.log("[TokenSync] Token ditemukan di localStorage, sinkronisasi ke cookie");
      ensureTokenCookie(token);
      syncPerformed.current = true;
    } else {
      console.log("[TokenSync] Tidak ada token di localStorage untuk disinkronkan");
    }

    // Tambahkan event listener untuk perubahan storage
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token') {
        console.log("[TokenSync] Deteksi perubahan token:", e.newValue ? "token baru" : "token dihapus");

        if (e.newValue) {
          // Token baru disimpan
          console.log("[TokenSync] Menyinkronkan token baru ke cookie");
          ensureTokenCookie(e.newValue);
        } else {
          // Token dihapus
          console.log("[TokenSync] Menghapus cookie token");
          document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Komponen ini tidak merender apa-apa
  return null;
} 