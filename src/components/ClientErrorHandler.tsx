"use client";

import React, { ReactNode } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import ErrorHandlerProvider from "@/providers/error-handler-provider";

interface ClientErrorHandlerProps {
  children: ReactNode;
}

/**
 * Komponen Client untuk membungkus ErrorBoundary dan ErrorHandlerProvider
 * yang tidak dapat digunakan langsung di Server Components
 */
export default function ClientErrorHandler({ children }: ClientErrorHandlerProps) {
  return (
    <ErrorHandlerProvider>
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
    </ErrorHandlerProvider>
  );
} 