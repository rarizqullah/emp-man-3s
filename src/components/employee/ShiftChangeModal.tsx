"use client";

import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";

// Schema validasi untuk form perubahan shift
const shiftChangeSchema = z.object({
  shift: z.string({
    required_error: "Shift harus dipilih"
  }),
  effectiveDate: z.date({
    required_error: "Tanggal efektif harus diisi"
  }),
  notes: z.string().optional(),
});

// Type untuk data perubahan shift
type ShiftChangeFormValues = z.infer<typeof shiftChangeSchema>;

// Type untuk data shift
interface Shift {
  id: string;
  name: string;
  shiftType: string;
  subDepartmentId: string | null;
  mainWorkStart?: string | null;
  mainWorkEnd?: string | null;
  regularOvertimeStart?: string | null;
  regularOvertimeEnd?: string | null;
  weeklyOvertimeStart?: string | null;
  weeklyOvertimeEnd?: string | null;
  workingDays?: string[] | null;
  // Properti tambahan untuk tampilan detail
  startTime?: string | null;
  endTime?: string | null;
  breakStartTime?: string | null;
  breakEndTime?: string | null;
  subDepartment?: {
    id: string;
    name: string;
  } | null;
}

interface ShiftChangeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeName?: string;
  employeeId?: string;
  currentShift?: string;
  subDepartmentId?: string;
  onSubmit?: (data: ShiftChangeFormValues, employeeId: string) => Promise<void>;
}

export function ShiftChangeModal({
  open,
  onOpenChange,
  employeeName = "Karyawan",
  employeeId = "",
  currentShift = "Non-Shift",
  subDepartmentId = "",
  onSubmit
}: ShiftChangeModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filteredShifts, setFilteredShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  
  // Default values untuk form
  const defaultValues: Partial<ShiftChangeFormValues> = {
    shift: currentShift,
    effectiveDate: new Date(),
    notes: "",
  };
  
  const form = useForm<ShiftChangeFormValues>({
    resolver: zodResolver(shiftChangeSchema),
    defaultValues,
  });
  
  // Fungsi untuk mengambil data shift dari API
  const fetchShifts = async () => {
    if (!open) return;
    
    try {
      setIsLoading(true);
      let url = "/api/shifts";
      
      // Jika subDepartmentId tersedia, gunakan sebagai filter
      if (subDepartmentId) {
        url += `?subDepartmentId=${subDepartmentId}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Gagal mengambil data shift");
      }
      
      const data = await response.json();
      
      // Filter shift berdasarkan subDepartmentId
      if (subDepartmentId) {
        // Tampilkan shift yang cocok dengan subDepartmentId atau bersifat global (null)
        const filtered = data.filter(
          (shift: Shift) => shift.subDepartmentId === subDepartmentId || shift.subDepartmentId === null
        );
        setFilteredShifts(filtered);
      } else {
        // Jika tidak ada subDepartmentId, tampilkan shift global saja
        const filtered = data.filter((shift: Shift) => shift.subDepartmentId === null);
        setFilteredShifts(filtered);
      }
    } catch (error) {
      console.error("Error fetching shifts:", error);
      toast.error("Gagal memuat data shift");
    } finally {
      setIsLoading(false);
    }
  };

  // Menggunakan useEffect untuk mengambil data saat modal dibuka atau subDepartmentId berubah
  useEffect(() => {
    if (open) {
      // Reset form saat modal dibuka dengan data baru
      form.reset({
        ...defaultValues,
        shift: currentShift
      });
      
      // Ambil data shift dari API
      fetchShifts();
    }
  }, [open, subDepartmentId, currentShift]);
  
  const handleSubmit = async (data: ShiftChangeFormValues) => {
    if (!onSubmit || !employeeId) {
      console.error("Incomplete parameters for submission");
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Kirim permintaan langsung ke fungsi onSubmit (handleChangeShift)
      // Ini akan mengirim data ke endpoint shift-history
      await onSubmit(data, employeeId);
      
      form.reset();
      onOpenChange(false);
      toast.success("Shift karyawan berhasil diubah");
    } catch (error) {
      console.error("Error submitting shift change:", error);
      toast.error(error instanceof Error ? error.message : "Gagal mengubah shift. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Format jam kerja dalam format 24 jam (HH:MM)
  const formatTimeOnly = (timeString: string | null | undefined) => {
    if (!timeString) return '—';
    try {
      const time = new Date(timeString);
      return time.toLocaleTimeString('id-ID', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: false 
      });
    } catch {
      return '—';
    }
  };
  
  // Mengubah handler onValueChange pada select shift untuk mengatur selectedShift
  const handleShiftChange = (shiftId: string) => {
    form.setValue("shift", shiftId);
    
    // Atur selectedShift berdasarkan shiftId yang dipilih
    const selected = filteredShifts.find(shift => shift.id === shiftId);
    setSelectedShift(selected || null);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Ubah Shift Karyawan</DialogTitle>
          <DialogDescription>
            Pengaturan jadwal shift untuk {employeeName}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="shift"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Shift Baru</FormLabel>
                  <Select 
                    onValueChange={handleShiftChange} 
                    defaultValue={field.value}
                    disabled={isLoading || filteredShifts.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={isLoading ? "Memuat shift..." : "Pilih shift baru"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {filteredShifts.map((shift) => (
                        <SelectItem key={shift.id} value={shift.id}>
                          {shift.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="effectiveDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Tanggal Efektif</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                      onChange={(e) => {
                        field.onChange(e.target.value ? new Date(e.target.value) : null);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Catatan</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Masukkan catatan jika diperlukan"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="col-span-2 space-y-2">
              <div className="flex justify-between items-center pt-2">
                <h4 className="text-sm font-medium">Detail Shift</h4>
                <div className="text-sm text-muted-foreground">
                  {isLoading && <Loader2 className="h-4 w-4 inline mr-2 animate-spin" />}
                  {!selectedShift ? 'Pilih shift untuk melihat detail' : ''}
                </div>
              </div>
              
              {selectedShift && (
                <div className="grid grid-cols-2 gap-3 p-4 border rounded-lg bg-gray-50">
                  <div>
                    <p className="text-sm font-medium">Nama Shift</p>
                    <p className="text-sm">{selectedShift.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Tipe Shift</p>
                    <p className="text-sm">{
                      selectedShift.shiftType === 'FIXED' ? 'Tetap' : 
                      selectedShift.shiftType === 'FLEXIBLE' ? 'Fleksibel' : 
                      selectedShift.shiftType || '—'
                    }</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Jam Masuk</p>
                    <p className="text-sm">{formatTimeOnly(selectedShift.mainWorkStart || selectedShift.startTime)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Jam Pulang</p>
                    <p className="text-sm">{formatTimeOnly(selectedShift.mainWorkEnd || selectedShift.endTime)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Jam Istirahat</p>
                    <p className="text-sm">{formatTimeOnly(selectedShift.breakStartTime)} - {formatTimeOnly(selectedShift.breakEndTime)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Hari Kerja</p>
                    <p className="text-sm">{selectedShift.workingDays ? selectedShift.workingDays.join(', ') : '—'}</p>
                  </div>
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button 
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  "Simpan Perubahan"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 