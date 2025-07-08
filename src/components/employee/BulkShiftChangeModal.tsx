"use client";

import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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

interface Department {
  id: string;
  name: string;
}

interface SubDepartment {
  id: string;
  name: string;
  departmentId: string;
}

interface Shift {
  id: string;
  name: string;
  shiftType: string;
  subDepartmentId: string | null;
}

interface Employee {
  id: string;
  employeeId: string;
  user: {
    name: string;
  };
  department: {
    name: string;
  };
  subDepartment?: {
    name: string;
  };
}

// Schema validasi untuk form bulk shift change
const bulkShiftChangeSchema = z.object({
  departmentId: z.string().min(1, { message: "Departemen harus dipilih" }),
  subDepartmentId: z.string().optional(),
  shiftId: z.string().min(1, { message: "Shift harus dipilih" }),
  effectiveDate: z.string().min(1, { message: "Tanggal efektif harus diisi" }),
  notes: z.string().optional(),
});

type BulkShiftChangeFormValues = z.infer<typeof bulkShiftChangeSchema>;

interface BulkShiftChangeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedEmployeeIds: string[];
  onSuccess: () => void;
}

export function BulkShiftChangeModal({
  open,
  onOpenChange,
  selectedEmployeeIds,
  onSuccess,
}: BulkShiftChangeModalProps) {
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subDepartments, setSubDepartments] = useState<SubDepartment[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([]);

  // Form
  const form = useForm<BulkShiftChangeFormValues>({
    resolver: zodResolver(bulkShiftChangeSchema),
    defaultValues: {
      departmentId: "",
      subDepartmentId: "",
      shiftId: "",
      effectiveDate: new Date().toISOString().split('T')[0],
      notes: "",
    },
  });

  const selectedDepartmentId = form.watch("departmentId");
  const selectedSubDepartmentId = form.watch("subDepartmentId");

  // Fetch data karyawan yang dipilih
  const fetchSelectedEmployees = async () => {
    try {
      const response = await fetch('/api/employees');
      if (!response.ok) throw new Error('Gagal mengambil data karyawan');
      
      const allEmployees = await response.json();
      const selected = allEmployees.filter((emp: Employee) => 
        selectedEmployeeIds.includes(emp.id)
      );
      setSelectedEmployees(selected);
    } catch (error) {
      console.error('Error fetching selected employees:', error);
      toast.error('Gagal mengambil data karyawan yang dipilih');
    }
  };

  // Fetch departments
  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/departments');
      if (!response.ok) throw new Error('Gagal mengambil data departemen');
      const data = await response.json();
      setDepartments(data);
    } catch (error) {
      console.error('Error fetching departments:', error);
      toast.error('Gagal mengambil data departemen');
    }
  };

  // Fetch sub departments
  const fetchSubDepartments = async (departmentId: string) => {
    try {
      const response = await fetch(`/api/sub-departments?departmentId=${departmentId}`);
      if (!response.ok) throw new Error('Gagal mengambil data sub departemen');
      const data = await response.json();
      setSubDepartments(data);
    } catch (error) {
      console.error('Error fetching sub departments:', error);
      setSubDepartments([]);
    }
  };

  // Fetch shifts
  const fetchShifts = async (subDepartmentId?: string) => {
    try {
      const url = subDepartmentId 
        ? `/api/shifts?subDepartmentId=${subDepartmentId}`
        : '/api/shifts';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Gagal mengambil data shift');
      const data = await response.json();
      setShifts(data);
    } catch (error) {
      console.error('Error fetching shifts:', error);
      setShifts([]);
    }
  };

  // Handle department change
  useEffect(() => {
    if (selectedDepartmentId) {
      fetchSubDepartments(selectedDepartmentId);
      form.setValue("subDepartmentId", "");
      form.setValue("shiftId", "");
    }
  }, [selectedDepartmentId, form]);

  // Handle sub department change
  useEffect(() => {
    if (selectedSubDepartmentId) {
      fetchShifts(selectedSubDepartmentId);
      form.setValue("shiftId", "");
    } else if (selectedDepartmentId) {
      fetchShifts();
      form.setValue("shiftId", "");
    }
  }, [selectedSubDepartmentId, selectedDepartmentId, form]);

  // Initialize data when modal opens
  useEffect(() => {
    if (open) {
      fetchDepartments();
      fetchSelectedEmployees();
      form.reset();
    }
  }, [open, form]);

  const onSubmit = async (data: BulkShiftChangeFormValues) => {
    try {
      setLoading(true);

      // Bulk update shifts
      const response = await fetch('/api/employees/bulk-shift-change', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeIds: selectedEmployeeIds,
          shiftId: data.shiftId,
          effectiveDate: data.effectiveDate,
          notes: data.notes,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Gagal mengubah shift karyawan');
      }

      toast.success(`Berhasil mengubah shift ${selectedEmployeeIds.length} karyawan`);
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating shifts:', error);
      toast.error(error instanceof Error ? error.message : 'Gagal mengubah shift karyawan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Ubah Shift Multiple Karyawan</DialogTitle>
          <DialogDescription>
            Mengubah shift untuk {selectedEmployeeIds.length} karyawan yang dipilih
          </DialogDescription>
        </DialogHeader>

        <div className="mb-4">
          <h4 className="text-sm font-medium mb-2">Karyawan yang dipilih:</h4>
          <div className="max-h-32 overflow-y-auto border rounded p-2 text-sm">
            {selectedEmployees.map((emp) => (
              <div key={emp.id} className="flex justify-between py-1">
                <span>{emp.user.name}</span>
                <span className="text-muted-foreground">
                  {emp.department.name} {emp.subDepartment ? `- ${emp.subDepartment.name}` : ''}
                </span>
              </div>
            ))}
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="departmentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Departemen</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih departemen" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {subDepartments.length > 0 && (
              <FormField
                control={form.control}
                name="subDepartmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sub Departemen</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih sub departemen" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {subDepartments.map((subDept) => (
                          <SelectItem key={subDept.id} value={subDept.id}>
                            {subDept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="shiftId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Shift Baru</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih shift" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {shifts.map((shift) => (
                        <SelectItem key={shift.id} value={shift.id}>
                          {shift.name} ({shift.shiftType})
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
                <FormItem>
                  <FormLabel>Tanggal Efektif</FormLabel>
                  <FormControl>
                    <Input 
                      type="date" 
                      className="w-full"
                      {...field} 
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
                <FormItem>
                  <FormLabel>Catatan (Opsional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Catatan perubahan shift..."
                      {...field}
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
                disabled={loading}
              >
                Batal
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Ubah Shift
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 