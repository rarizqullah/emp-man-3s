"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, AlertTriangle, Loader2, Shield } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface BulkDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedEmployees: string[];
  employeeNames: string[];
  onSuccess: () => void;
}

interface FormData {
  reason: string;
  confirmPassword: string;
}

export function BulkDeleteModal({
  isOpen,
  onClose,
  selectedEmployees,
  employeeNames,
  onSuccess,
}: BulkDeleteModalProps) {
  const [formData, setFormData] = useState<FormData>({
    reason: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'warning' | 'confirm'>('warning');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (step === 'warning') {
      if (!formData.reason.trim()) {
        toast.error("Alasan penghapusan harus diisi");
        return;
      }
      setStep('confirm');
      return;
    }

    if (formData.confirmPassword !== 'DELETE_PERMANENT') {
      toast.error('Ketik "DELETE_PERMANENT" untuk mengonfirmasi');
      return;
    }

    if (selectedEmployees.length === 0) {
      toast.error("Tidak ada karyawan yang dipilih");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/employees/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeIds: selectedEmployees,
          reason: formData.reason.trim(),
          confirmPassword: formData.confirmPassword,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle specific error types
        if (result.errorType === 'salary_data') {
          toast.error(
            "❌ Tidak dapat menghapus karyawan",
            {
              duration: 10000,
              description: `${result.error} Selesaikan pembayaran gaji terlebih dahulu di menu Gaji.`
            }
          );
          return;
        }

        if (result.errorType === 'allowance_data') {
          toast.error(
            "❌ Tidak dapat menghapus karyawan", 
            {
              duration: 10000,
              description: `${result.error} Hapus data tunjangan terlebih dahulu di menu Konfigurasi.`
            }
          );
          return;
        }

        throw new Error(result.error || 'Gagal menghapus karyawan');
      }

      toast.success(
        `✅ ${result.message}`,
        {
          duration: 8000,
          description: `${result.details.successCount} karyawan berhasil dihapus secara permanen dalam ${result.details.executionTime}ms`
        }
      );

      // Show failed items if any
      if (result.details.failed?.length > 0) {
        toast.warning(
          `⚠️ ${result.details.failed.length} karyawan gagal dihapus`,
          {
            duration: 10000,
            description: result.details.failed.map((item: any) => 
              `${item.error}`
            ).join(', ')
          }
        );
      }

      onSuccess();
      handleClose();

    } catch (error) {
      console.error('Error deleting employees:', error);
      toast.error(
        "❌ Gagal menghapus karyawan",
        {
          description: error instanceof Error ? error.message : 'Terjadi kesalahan yang tidak diketahui'
        }
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setStep('warning');
      setFormData({
        reason: '',
        confirmPassword: '',
      });
      onClose();
    }
  };

  const handleBack = () => {
    setStep('warning');
    setFormData({ ...formData, confirmPassword: '' });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="h-5 w-5" />
            {step === 'warning' ? 'Hapus Permanen - Bulk' : 'Konfirmasi Penghapusan'}
          </DialogTitle>
          <DialogDescription>
            {step === 'warning' 
              ? `Menghapus PERMANEN ${selectedEmployees.length} karyawan yang terpilih`
              : 'Konfirmasi penghapusan dengan mengetik kata kunci'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {step === 'warning' && (
            <>
              {/* Critical Warning */}
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertTitle className="text-red-800">⚠️ PERINGATAN KRITIS</AlertTitle>
                <AlertDescription className="text-red-700 space-y-2">
                  <p><strong>Penghapusan ini PERMANEN dan TIDAK DAPAT DIBATALKAN!</strong></p>
                  <p>Data yang akan dihapus:</p>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>Data karyawan dan akun pengguna</li>
                    <li>Riwayat kehadiran</li>
                    <li>Riwayat kontrak, shift, dan peringatan</li>
                    <li>Data ijin dan tunjangan</li>
                    <li>Riwayat gaji yang sudah dibayar</li>
                  </ul>
                  <p><strong>Gunakan Archive jika ingin menyimpan data!</strong></p>
                </AlertDescription>
              </Alert>

              {/* Selected Employees Preview */}
              <div className="bg-slate-50 p-4 rounded-lg border">
                <Label className="text-sm font-medium text-slate-700">
                  Karyawan yang akan dihapus PERMANEN ({selectedEmployees.length})
                </Label>
                <div className="mt-2 max-h-24 overflow-y-auto">
                  <div className="text-sm text-slate-600">
                    {employeeNames.length > 0 ? employeeNames.join(', ') : 'Loading...'}
                  </div>
                </div>
              </div>

              {/* Reason */}
              <div className="space-y-2">
                <Label htmlFor="reason">Alasan Penghapusan Permanen *</Label>
                <Textarea
                  id="reason"
                  placeholder="Jelaskan alasan mengapa data karyawan ini harus dihapus secara permanen..."
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows={3}
                  required
                  className="border-red-200 focus:border-red-400"
                />
              </div>
            </>
          )}

          {step === 'confirm' && (
            <>
              {/* Final Confirmation */}
              <Alert className="border-red-200 bg-red-50">
                <Shield className="h-4 w-4 text-red-600" />
                <AlertTitle className="text-red-800">🔒 KONFIRMASI AKHIR</AlertTitle>
                <AlertDescription className="text-red-700">
                  <p>Untuk melanjutkan penghapusan permanen, ketik kata kunci:</p>
                  <p className="font-bold text-lg mt-2">DELETE_PERMANENT</p>
                </AlertDescription>
              </Alert>

              {/* Summary */}
              <div className="bg-slate-100 p-4 rounded-lg">
                <p className="text-sm text-slate-700">
                  <strong>Karyawan:</strong> {selectedEmployees.length} orang
                </p>
                <p className="text-sm text-slate-700 mt-1">
                  <strong>Alasan:</strong> {formData.reason}
                </p>
              </div>

              {/* Confirmation Input */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
                  Ketik "DELETE_PERMANENT" untuk mengonfirmasi *
                </Label>
                <Input
                  id="confirmPassword"
                  type="text"
                  placeholder="DELETE_PERMANENT"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                  className="border-red-200 focus:border-red-400 font-mono"
                />
              </div>
            </>
          )}

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={step === 'confirm' ? handleBack : handleClose}
              disabled={loading}
            >
              {step === 'confirm' ? 'Kembali' : 'Batal'}
            </Button>
            <Button 
              type="submit" 
              variant="destructive"
              disabled={loading || (step === 'warning' && !formData.reason.trim()) || (step === 'confirm' && formData.confirmPassword !== 'DELETE_PERMANENT')}
              className="bg-red-600 hover:bg-red-700"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menghapus...
                </>
              ) : step === 'warning' ? (
                'Lanjutkan ke Konfirmasi'
              ) : (
                `Hapus ${selectedEmployees.length} Karyawan PERMANEN`
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 