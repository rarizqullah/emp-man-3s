"use client";

import React, { useEffect, useRef } from "react";

/**
 * Komponen ini menangani keamanan khusus untuk halaman izin dan cuti,
 * mencegah redirect otomatis ke halaman login dan menampilkan pesan yang sesuai.
 */
export default function PermissionPageGuard({ children }: { children: React.ReactNode }) {
  const hasSetFlag = useRef(false);
  
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    // Set flag untuk mencegah redirect
    if (!hasSetFlag.current) {
      // Set flag global untuk mencegah redirect
      window.__FORCE_STAY_ON_PAGE__ = true;
      console.log("[Permission Page Guard] Flag __FORCE_STAY_ON_PAGE__ disetel ke true");
      hasSetFlag.current = true;
    }
    
    // Override history API untuk mencegah navigasi
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    // Fungsi untuk mendeteksi jika ada upaya untuk redirect ke login
    function historyOverride(original: typeof history.pushState) {
      return function(this: History, ...args: Parameters<typeof history.pushState>) {
        const [, , url] = args;
        
        // Cek jika ada upaya redirect ke login, cegah redirect
        if (typeof url === 'string' && (url.includes('/login') || url.includes('/auth'))) {
          console.log("[Permission Page Guard] Mencegah redirect ke:", url);
          return;
        }
        
        // Jika bukan redirect ke login, biarkan berjalan normal
        return original.apply(this, args);
      };
    }
    
    // Override history API
    history.pushState = historyOverride(originalPushState);
    history.replaceState = historyOverride(originalReplaceState);
    
    // Function to override fetch
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
      try {
        const response = await originalFetch(...args);
        
        // Jika ada error autentikasi dari API, tangani tanpa redirect
        if (response.status === 401 || response.status === 403) {
          // Dispatch event untuk penanganan di komponen lain
          window.dispatchEvent(new CustomEvent('auth:sessionExpired', { 
            detail: { preventRedirect: true } 
          }));
          
          // Biarkan response tetap berjalan normal 
          // sehingga komponen tetap dapat menanganinya
        }
        
        return response;
      } catch (error) {
        console.error("[Permission Page Guard] Fetch error:", error);
        return Promise.reject(error);
      }
    };
    
    // Clean up
    return () => {
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
      window.fetch = originalFetch;
      
      // Reset flag saat component di-unmount
      window.__FORCE_STAY_ON_PAGE__ = false;
      console.log("[Permission Page Guard] Flag __FORCE_STAY_ON_PAGE__ disetel ke false");
    };
  }, []);
  
  return (
    <>
      {children}
    </>
  );
} 