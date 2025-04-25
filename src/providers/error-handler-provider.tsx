"use client";

import React, { useEffect, ReactNode } from "react";
import { isExtensionError } from "@/lib/error-utils";

interface ErrorHandlerProviderProps {
  children: ReactNode;
}

/**
 * Provider yang menerapkan penanganan error global untuk ekstensi browser.
 * Khususnya menangani error dari ekstensi Binance dan router Next.js.
 */
export default function ErrorHandlerProvider({ children }: ErrorHandlerProviderProps) {
  useEffect(() => {
    // Referensi ke handler error asli
    const originalErrorHandler = window.onerror;
    
    // Custom error handler
    const customErrorHandler = (
      event: Event | string, 
      source?: string, 
      lineno?: number, 
      colno?: number, 
      error?: Error
    ) => {
      // Cek jika error berasal dari ekstensi browser
      if (
        (source && source.includes("chrome-extension://")) ||
        (error && isExtensionError(error))
      ) {
        console.log("Error dari ekstensi browser diblokir oleh ErrorHandlerProvider");
        return true; // Menghentikan propagasi error
      }
      
      // Jika bukan dari ekstensi, panggil handler asli
      if (typeof originalErrorHandler === 'function') {
        return originalErrorHandler(event, source, lineno, colno, error);
      }
      
      return false;
    };
    
    // Patch router events untuk menangani error terkait router
    const patchRouterEvents = () => {
      // Periksa apakah ini adalah aplikasi Next.js
      const isNextApp = typeof window !== 'undefined' && 
                        // Periksa fitur khas Next.js
                        document.getElementById('__next') !== null;
      
      if (isNextApp) {
        console.log("Next.js app terdeteksi, mempersiapkan patch untuk router events");
      }
      
      // Mencoba menangkap semua error Promise
      window.addEventListener("unhandledrejection", (event) => {
        if (isExtensionError(event.reason)) {
          console.log("Promise rejection dari ekstensi browser diblokir oleh ErrorHandlerProvider");
          event.preventDefault();
          event.stopPropagation();
        }
      });
    };
    
    // Override error handler global
    window.onerror = customErrorHandler;
    
    // Patch router events
    patchRouterEvents();
    
    return () => {
      // Bersihkan handler saat komponen unmount
      window.onerror = originalErrorHandler;
      // Unhandled rejection tidak perlu dibersihkan karena kita tidak menyimpan referensi
    };
  }, []);
  
  return <>{children}</>;
} 