"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

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
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

// Schema untuk form
const warningHistorySchema = z.object({
  warningStatus: z.enum(["NONE", "SP1", "SP2", "SP3"]),
  startDate: z.date(),
  endDate: z.date().optional().nullable(),
  reason: z.string().min(3, { message: "Alasan harus diisi minimal 3 karakter" }),
  attachmentUrl: z.string().optional(),
});

type WarningHistoryFormData = z.infer<typeof warningHistorySchema>;

interface AddWarningHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  onSuccess: () => void;
}

export function AddWarningHistoryModal({
  isOpen,
  onClose,
  employeeId,
  onSuccess,
}: AddWarningHistoryModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<WarningHistoryFormData>({
    resolver: zodResolver(warningHistorySchema),
    defaultValues: {
      warningStatus: "NONE",
      startDate: new Date(),
      endDate: null,
      reason: "",
      attachmentUrl: "",
    },
  });

  async function onSubmit(data: WarningHistoryFormData) {
    setIsSubmitting(true);

    try {
      console.log("Submitting warning history:", data);
      
      // Gunakan endpoint warning-status untuk mengupdate status SP dan menambahkan riwayat
      const response = await fetch(`/api/employees/${employeeId}/warning-status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          warningStatus: data.warningStatus,
          startDate: data.startDate,
          endDate: data.endDate,
          reason: data.reason,
          attachmentUrl: data.attachmentUrl || null
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        console.error("Failed to update warning status and history:", result);
        throw new Error(result.message || "Gagal memperbarui status SP dan menambahkan riwayat");
      }

      console.log("Warning status and history updated successfully:", result);
      toast.success("Status SP dan riwayat berhasil diperbarui");
      form.reset();
      onSuccess();
      onClose();
    } catch (error: unknown) {
      console.error("Error in warning history submission:", error);
      const errorMessage = error instanceof Error ? error.message : "Gagal menambahkan riwayat SP. Silakan coba lagi.";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Tambah Riwayat Surat Peringatan</DialogTitle>
          <DialogDescription>
            Tambahkan riwayat surat peringatan baru untuk karyawan ini.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="warningStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status SP</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih status SP" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="NONE">Tidak Ada SP</SelectItem>
                      <SelectItem value="SP1">SP 1</SelectItem>
                      <SelectItem value="SP2">SP 2</SelectItem>
                      <SelectItem value="SP3">SP 3</SelectItem>
                    </SelectContent>
                  </Select>
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
            </div>

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alasan</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Masukkan alasan pemberian SP"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button variant="outline" type="button" onClick={onClose}>
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 