"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary menangkap error dalam komponen anak dan menampilkan UI alternatif
 * alih-alih seluruh aplikasi crash.
 */
class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  static getDerivedStateFromError(error: Error): State {
    // Update state agar next render menampilkan UI fallback
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error ke layanan pelaporan error
    console.error("Error Boundary caught an error:", error, errorInfo);
    
    // Filter error yang berasal dari ekstensi browser
    if (
      error.message?.includes("chrome-extension://") ||
      error.message?.includes("binanceInjectedProvider") ||
      error.stack?.includes("chrome-extension://") ||
      errorInfo.componentStack?.includes("chrome-extension://")
    ) {
      console.log("Error dari ekstensi browser tertangkap oleh ErrorBoundary");
    }
    
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    // Cek jika error berasal dari ekstensi browser
    const isExtensionError =
      error?.message?.includes("chrome-extension://") ||
      error?.message?.includes("binanceInjectedProvider") ||
      error?.stack?.includes("chrome-extension://") ||
      error?.stack?.includes("egjidjbpglichdcondbcbdnbeeppgdph") ||
      error?.message?.includes("Cannot read properties of null (reading 'type')");

    if (hasError) {
      // Jika error dari ekstensi browser, coba tampilkan komponen anak
      if (isExtensionError) {
        console.log("Error dari ekstensi browser diblokir oleh ErrorBoundary, mencoba menampilkan konten");
        return children;
      }

      // Jika ada fallback custom, gunakan itu
      if (fallback) {
        return fallback;
      }

      // Fallback UI default
      return (
        <div className="p-6 mx-auto max-w-2xl text-center rounded-lg border shadow-sm mt-10">
          <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
          <h2 className="text-xl font-bold mb-2">Terjadi Kesalahan</h2>
          <p className="text-gray-600 mb-4">
            Maaf, terjadi kesalahan saat menampilkan bagian ini.
          </p>
          <div className="mb-4 p-2 bg-gray-100 rounded text-left overflow-auto text-xs max-h-32">
            <pre>{error?.message || "Unknown error"}</pre>
          </div>
          <Button onClick={this.handleReset}>Coba Lagi</Button>
        </div>
      );
    }

    // Jika tidak ada error, tampilkan komponen anak seperti biasa
    return children;
  }
}

export default ErrorBoundary; 