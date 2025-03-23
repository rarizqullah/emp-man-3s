"use client";

import React, { useState, useEffect, createContext, useContext } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Topbar } from "@/components/dashboard/Topbar";
import { Loader2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { Toaster } from "react-hot-toast";
import { useAuth } from "@/lib/auth-context";

// Buat context untuk mengelola status autentikasi global
interface SessionContextType {
  isStayOnPage: boolean;
  setStayOnPage: (value: boolean) => void;
  isUnauthenticated: boolean;
  setUnauthenticated: (value: boolean) => void;
}

const SessionContext = createContext<SessionContextType>({
  isStayOnPage: false,
  setStayOnPage: () => {},
  isUnauthenticated: false,
  setUnauthenticated: () => {},
});

// Provider untuk status session
function SessionManagementProvider({ children }: { children: React.ReactNode }) {
  const [isStayOnPage, setStayOnPage] = useState(false);
  const [isUnauthenticated, setUnauthenticated] = useState(false);

  // Set window property saat mount
  useEffect(() => {
    // Cek apakah halaman saat ini adalah halaman izin atau cuti
    const isPermissionOrLeavePage = 
      typeof window !== 'undefined' && 
      window.location && (
        window.location.pathname.includes('/permission') || 
        window.location.pathname.includes('/leave')
      );
    
    // Jika pada halaman izin/cuti, setel flag
    if (isPermissionOrLeavePage) {
      window.__FORCE_STAY_ON_PAGE__ = true;
      console.log("[SessionManagementProvider] Halaman izin/cuti terdeteksi, __FORCE_STAY_ON_PAGE__ = true");
    }
    
    const stayOnPage = typeof window !== 'undefined' && window.__FORCE_STAY_ON_PAGE__ === true;
    console.log("[SessionManagementProvider] __FORCE_STAY_ON_PAGE__ disetel:", stayOnPage);
    setStayOnPage(stayOnPage);
  }, []);

  useEffect(() => {
    const handleSessionExpired = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log("[SessionManagementProvider] Event session expired:", customEvent.detail);
      
      if (customEvent.detail?.preventRedirect) {
        setUnauthenticated(true);
        console.log("[SessionManagementProvider] Mencegah redirect, tampilkan banner");
      }
    };
    
    window.addEventListener('auth:sessionExpired', handleSessionExpired);
    
    return () => {
      window.removeEventListener('auth:sessionExpired', handleSessionExpired);
    };
  }, []);
  
  return (
    <SessionContext.Provider value={{ 
      isStayOnPage, 
      setStayOnPage, 
      isUnauthenticated, 
      setUnauthenticated 
    }}>
      {children}
    </SessionContext.Provider>
  );
}

export const useSession = () => useContext(SessionContext);

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const authChecked = React.useRef(false);
  const pathname = usePathname();

  // Fungsi untuk menangani perubahan ukuran jendela
  const handleResize = () => {
    if (typeof window !== 'undefined') {
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    }
  };

  // Cek autentikasi saat komponen dimuat
  useEffect(() => {
    // Jika autentikasi sudah diperiksa, tidak perlu periksa lagi
    if (authChecked.current) return;

    // Menggunakan data dari Supabase
    checkAuth();
    
    // Listener untuk resize window
    handleResize();
    
    window.addEventListener("resize", handleResize);
    
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [loading, user]);

  const checkAuth = () => {
    try {
      console.log("[DashboardLayout] Memeriksa autentikasi dengan Supabase, loading:", loading);
      
      // Periksa apakah halaman saat ini adalah halaman izin atau cuti
      const isPermissionOrLeavePage = 
        typeof window !== 'undefined' && 
        window.location && (
          window.location.pathname.includes('/permission') || 
          window.location.pathname.includes('/leave')
        );
      
      // Periksa apakah halaman memiliki flag stay-on-page
      const stayOnPage = 
        typeof window !== 'undefined' && 
        (window.__FORCE_STAY_ON_PAGE__ === true || isPermissionOrLeavePage);
      
      console.log("[DashboardLayout] Halaman saat ini:", window.location.pathname);
      console.log("[DashboardLayout] IsPermissionOrLeavePage:", isPermissionOrLeavePage);
      console.log("[DashboardLayout] __FORCE_STAY_ON_PAGE__ disetel:", stayOnPage);
      
      // Masih loading session
      if (loading) {
        console.log("[DashboardLayout] Session masih loading");
        return;
      }
      
      // Periksa autentikasi dari Supabase
      if (!user) {
        console.log("[DashboardLayout] Session tidak terautentikasi");
        
        if (stayOnPage || isPermissionOrLeavePage) {
          console.log("[DashboardLayout] Stay on page aktif, tidak melakukan redirect");
          authChecked.current = true;
          setIsAuthenticated(true); // tetap set true agar konten ditampilkan
          
          // Trigger event khusus
          if (typeof window !== 'undefined') {
            const event = new CustomEvent('auth:sessionExpired', { 
              detail: { preventRedirect: true } 
            });
            window.dispatchEvent(event);
          }
          return;
        }
        
        // Jika bukan halaman izin/cuti, redirect ke login
        console.log("[DashboardLayout] Redirect ke login");
        // Tandai untuk mencegah double redirect
        authChecked.current = true;
        
        // Tambahkan parameter redirect_to untuk kembali ke halaman ini setelah login
        router.push(`/login?redirect_to=${encodeURIComponent(pathname || '/')}`);
        return;
      }
      
      // User sudah terautentikasi
      console.log("[DashboardLayout] User terautentikasi:", user.email);
      authChecked.current = true;
      setIsAuthenticated(true);
    } catch (error) {
      console.error("[DashboardLayout] Error memeriksa autentikasi:", error);
      setIsAuthenticated(false);
    }
  };

  // Tutup sidebar di mobile ketika navigasi
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  }, [pathname]);

  // Render loading state
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Memuat dashboard...</p>
        </div>
      </div>
    );
  }

  // Jika belum autentikasi, kembalikan null
  if (!isAuthenticated && !loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Mengalihkan ke halaman login...</p>
        </div>
      </div>
    );
  }

  // Layout utama dashboard
  return (
    <SessionManagementProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
        <div className="flex flex-col flex-1 overflow-hidden">
          <Topbar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
          <main className="flex-1 overflow-y-auto p-4">
            {/* Info Banner jika ada masalah autentikasi */}
            <SessionWarningBanner />
            {children}
          </main>
        </div>
      </div>
      <Toaster />
    </SessionManagementProvider>
  );
}

// Komponen banner peringatan
function SessionWarningBanner() {
  const { isUnauthenticated } = useSession();
  
  if (!isUnauthenticated) return null;
  
  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <p className="text-sm text-yellow-700">
            <strong>Mode tampilan terbatas:</strong> Sesi Anda mungkin telah berakhir. Beberapa fitur mungkin tidak berfungsi dengan benar, tapi Anda tetap dapat menjelajahi halaman sistem.
          </p>
        </div>
      </div>
    </div>
  );
} 