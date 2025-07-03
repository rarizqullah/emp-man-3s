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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, AlertTriangle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface BulkWarningStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedEmployees: string[];
  employeeNames: string[];
  onSuccess: () => void;
}

interface FormData {
  warningStatus: 'NONE' | 'SP1' | 'SP2' | 'SP3';
  startDate: Date;
  endDate: Date | null;
  reason: string;
}

export function BulkWarningStatusModal({
  isOpen,
  onClose,
  selectedEmployees,
  employeeNames,
  onSuccess,
}: BulkWarningStatusModalProps) {
  const [formData, setFormData] = useState<FormData>({
    warningStatus: 'SP1',
    startDate: new Date(),
    endDate: null,
    reason: '',
  });
  const [loading, setLoading] = useState(false);

  const warningStatusOptions = [
    { value: 'NONE', label: 'Tidak Ada Peringatan', color: 'bg-green-100 text-green-800' },
    { value: 'SP1', label: 'Surat Peringatan 1', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'SP2', label: 'Surat Peringatan 2', color: 'bg-orange-100 text-orange-800' },
    { value: 'SP3', label: 'Surat Peringatan 3', color: 'bg-red-100 text-red-800' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.reason.trim()) {
      toast.error("Alasan perubahan status peringatan harus diisi");
      return;
    }

    if (selectedEmployees.length === 0) {
      toast.error("Tidak ada karyawan yang dipilih");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/employees/bulk-warning-change', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeIds: selectedEmployees,
          warningStatus: formData.warningStatus,
          startDate: formData.startDate.toISOString(),
          endDate: formData.endDate?.toISOString() || null,
          reason: formData.reason.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Gagal mengubah status peringatan');
      }

      toast.success(
        `✅ ${result.message}`,
        {
          duration: 5000,
          description: `${result.details.successCount} karyawan berhasil diubah ke ${formData.warningStatus}`
        }
      );

      // Show failed items if any
      if (result.details.failed?.length > 0) {
        toast.warning(
          `⚠️ ${result.details.failed.length} karyawan gagal diproses`,
          {
            duration: 8000,
            description: result.details.failed.map((item: any) => 
              `${item.employeeName}: ${item.error}`
            ).join(', ')
          }
        );
      }

      onSuccess();
      handleClose();

    } catch (error) {
      console.error('Error updating warning status:', error);
      toast.error(
        "❌ Gagal mengubah status peringatan",
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
      setFormData({
        warningStatus: 'SP1',
        startDate: new Date(),
        endDate: null,
        reason: '',
      });
      onClose();
    }
  };

  const selectedOption = warningStatusOptions.find(opt => opt.value === formData.warningStatus);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Ubah Status Peringatan - Bulk
          </DialogTitle>
          <DialogDescription>
            Mengubah status peringatan untuk {selectedEmployees.length} karyawan yang terpilih
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Selected Employees Preview */}
          <div className="bg-slate-50 p-4 rounded-lg">
            <Label className="text-sm font-medium text-slate-700">
              Karyawan Terpilih ({selectedEmployees.length})
            </Label>
            <div className="mt-2 max-h-20 overflow-y-auto">
              <div className="text-sm text-slate-600">
                {employeeNames.length > 0 ? employeeNames.join(', ') : 'Loading...'}
              </div>
            </div>
          </div>

          {/* Warning Status Selection */}
          <div className="space-y-2">
            <Label htmlFor="warningStatus">Status Peringatan Baru *</Label>
            <Select
              value={formData.warningStatus}
              onValueChange={(value: 'NONE' | 'SP1' | 'SP2' | 'SP3') => 
                setFormData({ ...formData, warningStatus: value })
              }
            >
              <SelectTrigger>
                <SelectValue>
                  {selectedOption && (
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${selectedOption.color}`}>
                        {selectedOption.label}
                      </span>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {warningStatusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${option.color}`}>
                        {option.label}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tanggal Mulai *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.startDate ? (
                      format(formData.startDate, "dd MMMM yyyy", { locale: id })
                    ) : (
                      <span>Pilih tanggal</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.startDate}
                    onSelect={(date) => 
                      setFormData({ ...formData, startDate: date || new Date() })
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Tanggal Berakhir (Opsional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.endDate ? (
                      format(formData.endDate, "dd MMMM yyyy", { locale: id })
                    ) : (
                      <span>Pilih tanggal</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.endDate}
                    onSelect={(date) => 
                      setFormData({ ...formData, endDate: date })
                    }
                    initialFocus
                    disabled={(date) => 
                      formData.startDate ? date < formData.startDate : false
                    }
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Alasan Perubahan Status *</Label>
            <Textarea
              id="reason"
              placeholder="Jelaskan alasan perubahan status peringatan..."
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              rows={3}
              required
            />
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              disabled={loading}
            >
              Batal
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !formData.reason.trim()}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                `Ubah Status ${selectedEmployees.length} Karyawan`
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 