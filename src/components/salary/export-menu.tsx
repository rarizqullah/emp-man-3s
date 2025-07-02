"use client";

import { useState } from "react";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ExportMenuProps {
  onExport?: (format: 'excel') => Promise<void>;
  disabled?: boolean;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  className?: string;
}

export function ExportMenu({ 
  onExport, 
  disabled = false, 
  size = "default",
  variant = "outline",
  className
}: ExportMenuProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!onExport) return;
    
    try {
      setIsExporting(true);
      await onExport('excel');
      toast.success('Data berhasil diekspor ke Excel');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Gagal mengekspor data ke Excel');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button 
      variant={variant} 
      size={size} 
      disabled={disabled || isExporting}
      onClick={handleExport}
      className={className}
    >
      {isExporting ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : (
        <FileSpreadsheet className="h-4 w-4 mr-2" />
      )}
      {isExporting ? "Mengekspor..." : "Export Excel"}
    </Button>
  );
}

interface ExportButtonProps {
  format: 'excel';
  onExport?: (format: 'excel') => Promise<void>;
  disabled?: boolean;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  children?: React.ReactNode;
}

export function ExportButton({ 
  format,
  onExport, 
  disabled = false, 
  size = "default",
  variant = "outline",
  children
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!onExport) return;
    
    try {
      setIsExporting(true);
      await onExport(format);
      toast.success('Data berhasil diekspor ke Excel');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Gagal mengekspor data ke Excel');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button 
      variant={variant} 
      size={size} 
      disabled={disabled || isExporting}
      onClick={handleExport}
    >
      {isExporting ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : (
        <FileSpreadsheet className="h-4 w-4 mr-2" />
      )}
      {children || (isExporting ? "Mengekspor..." : "Export Excel")}
    </Button>
  );
}
