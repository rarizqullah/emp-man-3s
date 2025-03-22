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
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";

// Schema validasi untuk form status SP
const warningStatusSchema = z.object({
  warningStatus: z.enum(["NONE", "SP1", "SP2", "SP3"], {
    required_error: "Status SP harus dipilih"
  }),
  startDate: z.date({
    required_error: "Tanggal mulai harus diisi"
  }),
  endDate: z.date({
    required_error: "Tanggal berakhir harus diisi"
  }).optional().nullable(),
  reason: z.string({
    required_error: "Alasan harus diisi"
  }).min(5, { message: "Alasan harus diisi minimal 5 karakter" }),
});

// Type untuk data SP
type WarningStatusFormValues = z.infer<typeof warningStatusSchema>;

interface WarningStatusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeName?: string;
  employeeId?: string;
  currentStatus?: string;
  onSubmit?: (data: WarningStatusFormValues, employeeId: string) => Promise<void>;
}

export function WarningStatusModal({ 
  open, 
  onOpenChange,
  employeeName = "Karyawan",
  employeeId = "",
  currentStatus = "NONE",
  onSubmit 
}: WarningStatusModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Default values untuk form
  const defaultValues: Partial<WarningStatusFormValues> = {
    warningStatus: currentStatus as "NONE" | "SP1" | "SP2" | "SP3",
    startDate: new Date(),
    endDate: null,
    reason: "",
  };
  
  const form = useForm<WarningStatusFormValues>({
    resolver: zodResolver(warningStatusSchema),
    defaultValues,
  });
  
  // Reset form saat modal dibuka dengan data baru
  useEffect(() => {
    if (open) {
      form.reset({
        ...defaultValues,
        warningStatus: currentStatus as "NONE" | "SP1" | "SP2" | "SP3"
      });
    }
  }, [open, currentStatus, form]);
  
  const handleSubmit = async (data: WarningStatusFormValues) => {
    if (!onSubmit || !employeeId) {
      console.error("Incomplete parameters for submission");
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Log data untuk debugging
      console.log("Submitting warning status data:", {
        ...data,
        startDate: data.startDate.toISOString(),
        endDate: data.endDate ? data.endDate.toISOString() : null
      });
      
      // Panggil API untuk update status peringatan
      await onSubmit(data, employeeId);
      
      // Reset form dan tutup modal jika berhasil
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error("Error submitting warning status:", error);
      toast.error("Gagal mengubah status SP. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Mendapatkan tanggal berakhir default berdasarkan status SP
  const getDefaultEndDate = (status: string): Date | undefined => {
    const today = new Date();
    const newDate = new Date(today);
    
    switch (status) {
      case "SP1":
        // SP 1 berlaku 3 bulan
        newDate.setMonth(today.getMonth() + 3);
        return newDate;
      case "SP2":
        // SP 2 berlaku 6 bulan
        newDate.setMonth(today.getMonth() + 6);
        return newDate;
      case "SP3":
        // SP 3 berlaku 12 bulan
        newDate.setMonth(today.getMonth() + 12);
        return newDate;
      default:
        return undefined;
    }
  };
  
  // Update tanggal berakhir saat status SP berubah
  const handleStatusChange = (status: "NONE" | "SP1" | "SP2" | "SP3") => {
    form.setValue("warningStatus", status);
    const endDate = getDefaultEndDate(status);
    form.setValue("endDate", endDate || null);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Ubah Status SP</DialogTitle>
          <DialogDescription>
            Pengaturan status Surat Peringatan untuk {employeeName}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="warningStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status SP</FormLabel>
                  <FormControl>
                    <Select 
                      onValueChange={(value) => handleStatusChange(value as "NONE" | "SP1" | "SP2" | "SP3")} 
                      defaultValue={field.value}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih status SP" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">Tidak Ada</SelectItem>
                        <SelectItem value="SP1">SP 1</SelectItem>
                        <SelectItem value="SP2">SP 2</SelectItem>
                        <SelectItem value="SP3">SP 3</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Tanggal Mulai</FormLabel>
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
              
              {form.watch("warningStatus") !== "NONE" && (
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Tanggal Berakhir</FormLabel>
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
              )}
            </div>
            
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alasan Perubahan Status</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder={form.watch("warningStatus") === "NONE" 
                        ? "Masukkan alasan pencabutan/pengakhiran SP" 
                        : "Masukkan alasan pemberian SP"
                      }
                      className="min-h-[100px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 