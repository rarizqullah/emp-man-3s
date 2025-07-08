"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

// Schema validasi untuk form
const contractChangeSchema = z.object({
  contractType: z.enum(["PERMANENT", "TRAINING"], {
    required_error: "Silakan pilih tipe kontrak",
  }),
  contractNumber: z.string().optional().nullable(),
  startDate: z.string({
    required_error: "Tanggal mulai kontrak harus diisi",
  }),
  endDate: z.string().optional().nullable(),
  status: z.string({
    required_error: "Status kontrak harus dipilih",
  }),
  notes: z.string().optional(),
});

// Type untuk data form
export type ContractChangeFormValues = z.infer<typeof contractChangeSchema>;

// Props untuk komponen
interface ContractChangeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeName?: string;
  employeeId?: string;
  currentContractType?: string;
  onSubmit?: (data: ContractChangeFormValues, employeeId: string) => Promise<void>;
}

// Komponen modal
export function ContractChangeModal({
  open,
  onOpenChange,
  employeeName = "Karyawan",
  employeeId = "",
  currentContractType = "Unknown",
  onSubmit,
}: ContractChangeModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inisialisasi form dengan resolver zod
  const form = useForm<ContractChangeFormValues>({
    resolver: zodResolver(contractChangeSchema),
    defaultValues: {
      contractType: currentContractType === "Permanen" ? "PERMANENT" : "TRAINING",
      contractNumber: "",
      startDate: new Date().toISOString().split('T')[0],
      endDate: "",
      status: "ACTIVE",
      notes: "",
    },
  });

  // Handler saat form disubmit
  const handleSubmit = async (data: ContractChangeFormValues) => {
    if (!employeeId) {
      toast.error("ID karyawan tidak ditemukan");
      return;
    }

    setIsSubmitting(true);
    try {
      // Konversi string date ke Date object untuk API
      const formattedData = {
        ...data,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
      };

      if (onSubmit) {
        await onSubmit(formattedData as any, employeeId);
      }

      // Reset form dan tutup modal
      form.reset();
      onOpenChange(false);
      toast.success("Kontrak berhasil diperbarui");
    } catch (error) {
      console.error("Error updating contract:", error);
      const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan saat mengubah kontrak";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form saat modal dibuka/ditutup
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      form.reset();
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Ubah Kontrak Karyawan</DialogTitle>
          <DialogDescription>
            Perbarui jenis kontrak untuk {employeeName}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="contractType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipe Kontrak</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih tipe kontrak" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="PERMANENT">Permanen</SelectItem>
                      <SelectItem value="TRAINING">Training</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contractNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nomor Kontrak</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Masukkan nomor kontrak (opsional)"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="col-span-2">
              <div className="mb-4">
                <p className="text-sm text-muted-foreground mb-1">
                  <strong>Petunjuk:</strong> Masukkan tanggal dengan format YYYY-MM-DD (contoh: 2024-05-15)
                </p>
              </div>
            </div>

            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tanggal Mulai</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      placeholder="YYYY-MM-DD"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tanggal Berakhir (Opsional)</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      placeholder="YYYY-MM-DD"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status Kontrak</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih status kontrak" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Aktif</SelectItem>
                      <SelectItem value="EXTENDED">Diperpanjang</SelectItem>
                      <SelectItem value="COMPLETED">Selesai</SelectItem>
                      <SelectItem value="TERMINATED">Diberhentikan</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Catatan</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Masukkan catatan (opsional)"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                    <span>Memproses...</span>
                  </>
                ) : (
                  "Simpan"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 