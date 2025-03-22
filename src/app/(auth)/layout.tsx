"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const hasCheckedAuth = useRef(false);

  useEffect(() => {
    // Hindari pemeriksaan autentikasi berulang
    if (hasCheckedAuth.current) {
      setIsLoading(false);
      return;
    }

    // Fungsi untuk memeriksa autentikasi
    const checkAuth = () => {
      try {
        // Gunakan try-catch karena localStorage/sessionStorage tidak tersedia di server
        const token = typeof window !== 'undefined' ? 
          sessionStorage.getItem("token") || localStorage.getItem("token") : 
          null;
        
        if (token) {
          // Redirect ke dashboard jika sudah login
          window.location.href = "/dashboard";
          return;
        }
      } catch (error) {
        console.error("[AuthLayout] Error checking auth:", error);
      }
      
      // Set loading ke false jika tidak ada token atau terjadi error
      hasCheckedAuth.current = true;
      setIsLoading(false);
    };
    
    // Jalankan pengecekan setelah component mount
    if (typeof window !== 'undefined') {
      // Pastikan kode hanya dijalankan di client-side
      checkAuth();
    } else {
      // Jika di server-side, langsung set loading ke false
      setIsLoading(false);
    }
  }, []);

  // Render loading state atau children
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Menyiapkan halaman...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex items-center justify-center bg-gray-50">
      {children}
    </div>
  );
} 