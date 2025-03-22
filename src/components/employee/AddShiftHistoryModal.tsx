"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// Skema validasi untuk form riwayat shift
const shiftHistorySchema = z.object({
  shiftId: z.string({
    required_error: "Shift harus dipilih",
  }),
  startDate: z.date({
    required_error: "Tanggal mulai shift harus diisi",
  }),
  endDate: z.date().optional().nullable(),
  notes: z.string().optional(),
});

// Type untuk data form
type ShiftHistoryFormData = z.infer<typeof shiftHistorySchema>;

interface Shift {
  id: string;
  name: string;
}

interface AddShiftHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  onSuccess: () => void;
}

export function AddShiftHistoryModal({
  isOpen,
  onClose,
  employeeId,
  onSuccess,
}: AddShiftHistoryModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoadingShifts, setIsLoadingShifts] = useState(true);
  const [loadShiftsError, setLoadShiftsError] = useState<string | null>(null);

  const form = useForm<ShiftHistoryFormData>({
    resolver: zodResolver(shiftHistorySchema),
    defaultValues: {
      shiftId: "",
      startDate: new Date(),
      endDate: null,
      notes: "",
    },
  });

  // Load shifts
  useEffect(() => {
    async function loadShifts() {
      try {
        setIsLoadingShifts(true);
        const response = await fetch('/api/shifts');
        
        if (!response.ok) {
          throw new Error('Failed to load shifts');
        }
        
        const data = await response.json();
        setShifts(data);
      } catch (error) {
        console.error('Error loading shifts:', error);
        setLoadShiftsError('Gagal memuat data shift. Silakan coba lagi.');
      } finally {
        setIsLoadingShifts(false);
      }
    }
    
    if (isOpen) {
      loadShifts();
    }
  }, [isOpen]);

  const onSubmit = async (data: ShiftHistoryFormData) => {
    try {
      setIsSubmitting(true);
      console.log("Mengirim data riwayat shift:", data);

      const response = await fetch(`/api/employees/${employeeId}/shift-history`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          shiftId: data.shiftId,
          effectiveDate: data.startDate,
          endDate: data.endDate,
          notes: data.notes,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Gagal menambahkan riwayat shift");
      }

      toast.success("Riwayat shift berhasil ditambahkan");
      form.reset();
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error adding shift history:", error);
      toast.error(error instanceof Error ? error.message : "Terjadi kesalahan saat menambahkan riwayat shift");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Tambah Riwayat Shift</DialogTitle>
          <DialogDescription>
            Tambahkan riwayat perubahan shift karyawan.
          </DialogDescription>
        </DialogHeader>

        {loadShiftsError && (
          <div className="bg-red-50 p-3 rounded-md text-red-600 mb-4">
            {loadShiftsError}
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="shiftId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Shift</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isLoadingShifts}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={isLoadingShifts ? "Memuat data shift..." : "Pilih shift"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {shifts.map((shift) => (
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Tanggal Mulai</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "dd/MM/yyyy")
                            ) : (
                              <span>Pilih tanggal</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < new Date("2000-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
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
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "dd/MM/yyyy")
                            ) : (
                              <span>Pilih tanggal (opsional)</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value || undefined}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < (form.getValues("startDate") || new Date())
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                onClick={onClose}
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