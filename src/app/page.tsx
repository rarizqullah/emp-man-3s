"use client";

import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function Home() {
  useEffect(() => {
    console.log("Home page mounted");
    
    const checkAuth = () => {
      try {
        // Periksa apakah user sudah login
        const token = localStorage.getItem("token");
        console.log("Home page - token:", token ? "ditemukan" : "tidak ditemukan");
        
        // Jika sudah login, arahkan ke dashboard
        if (token) {
          console.log("Redirecting ke dashboard...");
          window.location.href = "/dashboard";
        } else {
          // Jika belum login, arahkan ke halaman login
          console.log("Redirecting ke login...");
          window.location.href = "/login";
        }
      } catch (error) {
        console.error("Error checking auth:", error);
        // Redirect ke login sebagai fallback
        window.location.href = "/login";
      }
    };
    
    // Tunda sedikit untuk memastikan client-side rendering sudah selesai
    const timer = setTimeout(checkAuth, 300);
    
    return () => {
      clearTimeout(timer);
      console.log("Home page unmounted");
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-3xl font-bold">EMS System</h1>
        <p className="text-muted-foreground">Mengalihkan...</p>
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    </div>
  );
}
