"use client";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";

interface DeleteEmployeeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  employeeName: string;
  onSuccess: () => void;
}

export function DeleteEmployeeModal({
  open,
  onOpenChange,
  employeeId,
  employeeName,
  onSuccess,
}: DeleteEmployeeModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (isRetry = false, retryAttempt = 0) => {
    if (!employeeId) return;

    try {
      setIsDeleting(true);
      console.log(`Mengarsipkan karyawan dengan ID: ${employeeId}${isRetry ? ` (retry ${retryAttempt}/2)` : ''}`);

      // Enhanced timeout untuk archive operation - diperpanjang untuk mencocokkan backend
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 detik timeout

      try {
        const response = await fetch(`/api/employees/archive`, {
          method: "POST",
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': `archive-${employeeId}-${Date.now()}`,
          },
          body: JSON.stringify({
            employeeIds: [employeeId],
            reason: 'Diarsipkan melalui manajemen karyawan'
          })
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          // Enhanced error handling berdasarkan response dari backend
          let errorData: { error?: string; retryable?: boolean; errorType?: string } = {};
          try {
            errorData = await response.json();
          } catch {
            // Fallback jika tidak bisa parse JSON
          }
          
          const errorMessage = errorData.error || `Gagal mengarsipkan karyawan (Status: ${response.status})`;
          const isRetryable = errorData.retryable === true;
          const errorType = errorData.errorType || 'unknown';
          
          console.error(`Archive failed with status ${response.status}:`, {
            error: errorMessage,
            retryable: isRetryable,
            errorType,
            retryAttempt
          });
          
          // Auto-retry untuk retryable errors (kecuali error gaji/tunjangan)
          const isSalaryOrAllowanceError = errorMessage.includes('data gaji') || 
                                         errorMessage.includes('data tunjangan') || 
                                         errorMessage.includes('belum dibayar') ||
                                         errorMessage.includes('riwayat gaji') ||
                                         errorType === 'salary_data' ||
                                         errorType === 'allowance_data';
          
          if (isRetryable && retryAttempt < 2 && !isSalaryOrAllowanceError) {
            const nextRetryAttempt = retryAttempt + 1;
            const waitTime = Math.min(3000 * Math.pow(1.5, retryAttempt), 10000);
            
            console.log(`Auto-retrying delete in ${waitTime}ms (attempt ${nextRetryAttempt}/2)`);
            toast.info(`${errorMessage}. Mencoba lagi dalam ${Math.round(waitTime/1000)} detik...`, {
              description: `Percobaan ${nextRetryAttempt}/2`
            });
            
            await new Promise(resolve => setTimeout(resolve, waitTime));
            setIsDeleting(false);
            return handleDelete(true, nextRetryAttempt);
          }
          
          // Enhanced error messages berdasarkan error type
          switch (errorType) {
            case 'salary_data':
              throw new Error(errorMessage);
            case 'allowance_data':
              throw new Error(errorMessage);
            case 'timeout':
              throw new Error('Operasi penghapusan membutuhkan waktu terlalu lama. Server mungkin sedang sibuk.');
            case 'connection':
              throw new Error('Masalah koneksi database. Silakan coba lagi dalam beberapa saat.');
            case 'constraint':
              throw new Error('Karyawan tidak dapat dihapus karena masih memiliki data terkait. Silakan hapus data presensi atau riwayat lainnya terlebih dahulu.');
            case 'not_found':
              throw new Error('Karyawan tidak ditemukan atau sudah dihapus sebelumnya.');
            default:
              // Check for salary/allowance related errors - jangan retry untuk error jenis ini
              if (errorMessage.includes('data gaji') || 
                  errorMessage.includes('data tunjangan') || 
                  errorMessage.includes('belum dibayar') ||
                  errorMessage.includes('riwayat gaji')) {
                throw new Error(errorMessage); // Re-throw original error message as-is
              }
              throw new Error(errorMessage);
          }
        }

        const result = await response.json();
        
        // Validate response structure
        if (!result || typeof result !== 'object') {
          throw new Error('Format respons tidak valid dari server');
        }
        
        if (result.success) {
          console.log('✅ Employee archived successfully:', result);
          toast.success("Karyawan berhasil diarsipkan", {
            description: retryAttempt > 0 ? `Berhasil setelah ${retryAttempt + 1} percobaan` : undefined
          });
          
          // Close modal first
          onOpenChange(false);
          
          // Show immediate feedback
          toast.info("🔄 Memperbarui daftar karyawan...", { duration: 2000 });
          
          // Delay refresh to ensure database has processed the change
          setTimeout(() => {
            console.log('🔄 Refreshing employee list after archive...');
            onSuccess();
          }, 500);
        } else {
          throw new Error(result.error || "Gagal menghapus karyawan");
        }
        
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error("Error deleting employee:", errorMessage);
      
      // Enhanced error categorization
      const isNetworkError = error instanceof TypeError || errorMessage.includes('fetch');
      const isTimeoutError = (
        errorMessage.toLowerCase().includes('timeout') || 
        errorMessage.toLowerCase().includes('aborted') ||
        errorMessage.toLowerCase().includes('signal')
      );
      const isConnectionError = (
        errorMessage.toLowerCase().includes('koneksi') || 
        errorMessage.toLowerCase().includes('connection') ||
        errorMessage.toLowerCase().includes('database')
      );
      
      // Retry logic untuk network/timeout errors yang belum di-handle oleh backend
      const isSalaryOrAllowanceError = errorMessage.includes('data gaji') || 
                                     errorMessage.includes('data tunjangan') || 
                                     errorMessage.includes('belum dibayar') ||
                                     errorMessage.includes('riwayat gaji');
      
      const shouldRetry = (
        retryAttempt < 2 && 
        (isNetworkError || isTimeoutError) &&
        !errorMessage.toLowerCase().includes('tidak dapat dihapus') &&
        !errorMessage.toLowerCase().includes('tidak ditemukan') &&
        !isSalaryOrAllowanceError
      );
      
      if (shouldRetry) {
        const nextRetryAttempt = retryAttempt + 1;
        const waitTime = Math.min(4000 * Math.pow(1.5, retryAttempt), 12000);
        
        console.log(`Client-side retry in ${waitTime}ms due to network/timeout error`);
        
        let errorType = 'Network';
        if (isTimeoutError) errorType = 'Timeout';
        else if (isConnectionError) errorType = 'Connection';
        
        toast.error(`${errorType} error. Mencoba lagi dalam ${Math.round(waitTime/1000)} detik...`, {
          description: `Percobaan ${nextRetryAttempt}/2`,
          action: {
            label: "Retry Sekarang",
            onClick: () => {
              setIsDeleting(false);
              handleDelete(true, nextRetryAttempt);
            }
          }
        });
        
        await new Promise(resolve => setTimeout(resolve, waitTime));
        setIsDeleting(false);
        return handleDelete(true, nextRetryAttempt);
      }
      
      // Final error - no more retries
      let userFriendlyError = errorMessage;
      
      if (isNetworkError) {
        userFriendlyError = 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.';
      } else if (isTimeoutError && !errorMessage.includes('membutuhkan waktu terlalu lama')) {
        userFriendlyError = 'Permintaan timeout. Server membutuhkan waktu terlalu lama.';
      } else if (isConnectionError && !errorMessage.includes('koneksi database')) {
        userFriendlyError = 'Masalah koneksi. Silakan coba lagi nanti.';
      }
      
      // Show final error with retry count info
      const finalErrorMessage = retryAttempt > 0 
        ? `Gagal menghapus karyawan setelah ${retryAttempt + 1} percobaan: ${userFriendlyError}`
        : `Gagal menghapus karyawan: ${userFriendlyError}`;
      
      toast.error(finalErrorMessage, {
        description: retryAttempt > 0 ? "Silakan coba lagi nanti atau hubungi administrator." : undefined,
        duration: 5000
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Konfirmasi Arsip Karyawan</AlertDialogTitle>
          <AlertDialogDescription>
            Apakah Anda yakin ingin memindahkan karyawan <strong>{employeeName}</strong> ke arsip? 
            Data karyawan akan dipindahkan ke arsip dan dapat dipulihkan kembali jika diperlukan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
          <Button
            onClick={() => handleDelete(false)}
            disabled={isDeleting}
            variant="destructive"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span>Menghapus...</span>
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Arsipkan Karyawan</span>
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
} 