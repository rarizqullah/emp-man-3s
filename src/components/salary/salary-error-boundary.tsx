"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";

interface SalaryErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface SalaryErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export class SalaryErrorBoundary extends React.Component<
  SalaryErrorBoundaryProps,
  SalaryErrorBoundaryState
> {
  constructor(props: SalaryErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): SalaryErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('SalaryErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-lg font-semibold mb-2">
            Terjadi Kesalahan
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Terjadi kesalahan saat memuat komponen penggajian.
          </p>
          <Button
            onClick={() => {
              this.setState({ hasError: false, error: undefined });
              window.location.reload();
            }}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Muat Ulang
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
