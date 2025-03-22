"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

/**
 * Halaman fallback yang dipanggil oleh middleware ketika token tidak ditemukan
 * tapi masih ada kemungkinan token ada di localStorage
 */
export default function AuthFallback({
  redirectPath = "/login"
}: {
  redirectPath?: string
}) {
  const [isChecking, setIsChecking] = useState(true);
  const [message, setMessage] = useState("Memeriksa autentikasi...");

  useEffect(() => {
    const redirectTimeout = setTimeout(() => {
      // Safety timeout - jika terlalu lama, alihkan ke login
      if (isChecking) {
        console.log("[AuthFallback] Timeout: redirect ke login");
        window.location.replace(redirectPath);
      }
    }, 3000); // 3 detik timeout

    const checkAuth = async () => {
      try {
        console.log("[AuthFallback] Memeriksa token di localStorage");
        
        // Periksa token di localStorage
        const token = localStorage.getItem("token");
        console.log("[AuthFallback] Token:", token ? "ditemukan" : "tidak ditemukan");
        
        if (token) {
          setMessage("Token ditemukan, mengalihkan...");
          console.log("[AuthFallback] Token ditemukan di localStorage, mengaturnya sebagai cookie");
          
          // Set cookie
          const secure = window.location.protocol === 'https:' ? '; Secure' : '';
          const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString(); // 7 hari
          document.cookie = `token=${token}; Path=/; Expires=${expires}${secure}; SameSite=Lax`;
          
          // Cegah loop dengan menyimpan flag
          sessionStorage.setItem('auth_redirect_attempted', 'true');
          
          // Ambil redirect URL
          const urlParams = new URLSearchParams(window.location.search);
          const redirectTo = urlParams.get('redirect_to');
          
          // Tunggu sejenak sebelum redirect
          console.log("[AuthFallback] Menunggu sebelum redirect...");
          setTimeout(() => {
            setIsChecking(false);
            console.log("[AuthFallback] Redirecting ke halaman yang diminta...");
            window.location.replace(redirectTo || '/dashboard');
          }, 500);
        } else {
          setMessage("Token tidak ditemukan, mengalihkan ke login...");
          console.log("[AuthFallback] Token tidak ditemukan di localStorage, redirect ke login");
          setTimeout(() => {
            setIsChecking(false);
            window.location.replace(redirectPath);
          }, 500);
        }
      } catch (error) {
        console.error("[AuthFallback] Error saat memeriksa auth:", error);
        setMessage("Terjadi kesalahan, mengalihkan ke login...");
        setTimeout(() => {
          setIsChecking(false);
          window.location.replace(redirectPath);
        }, 500);
      }
    };
    
    checkAuth();
    
    return () => {
      clearTimeout(redirectTimeout);
    };
  }, [redirectPath]);
  
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
} 