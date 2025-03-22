"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ContractChangeModal } from "@/components/employee/ContractChangeModal";
import { ContractChangeFormValues } from "@/components/employee/ContractChangeModal";

// Tipe data untuk karyawan
interface Employee {
  id: string;
  employeeId: string;
  userId: string;
  departmentId: string;
  subDepartmentId?: string;
  positionId?: string;
  shiftId: string;
  contractType: string;
  contractNumber: string | null;
  contractStartDate: string;
  contractEndDate: string | null;
  warningStatus: string;
  gender: string | null;
  address: string | null;
  faceData?: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  department: {
    id: string;
    name: string;
  };
  subDepartment?: {
    id: string;
    name: string;
  } | null;
  position?: {
    id: string;
    name: string;
    level?: number;
  } | null;
  shift: {
    id: string;
    name: string;
    shiftType?: string;
  };
}

interface Department {
  id: string;
  name: string;
}

interface SubDepartment {
  id: string;
  name: string;
  departmentId: string;
}

interface Position {
  id: string;
  name: string;
  level?: number;
}

interface Shift {
  id: string;
  name: string;
  shiftType: string;
  subDepartmentId: string | null;
}

// Schema validasi untuk form edit karyawan
const employeeEditSchema = z.object({
  personalInfo: z.object({
    name: z.string().min(3, { message: "Nama harus diisi minimal 3 karakter" }),
    email: z.string().email({ message: "Format email tidak valid" }),
    gender: z.string(),
    address: z.string().optional(),
  }),
  departmentInfo: z.object({
    departmentId: z.string().min(1, { message: "Departemen harus dipilih" }),
    subDepartmentId: z.string().optional(),
    positionId: z.string().optional(),
    shiftId: z.string().min(1, { message: "Shift harus dipilih" }),
  }),
  contractInfo: z.object({
    contractType: z.string().min(1, { message: "Tipe kontrak harus dipilih" }),
    contractNumber: z.string().optional(),
    contractStartDate: z.string().min(1, { message: "Tanggal mulai kontrak harus diisi" }),
    contractEndDate: z.string().optional(),
  }),
});

type EmployeeEditFormValues = z.infer<typeof employeeEditSchema>;

export function EmployeeEditClient({ employeeId }: { employeeId: string }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("personal");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  
  // State untuk data referensi
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subDepartments, setSubDepartments] = useState<SubDepartment[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  
  // State untuk loading data referensi
  const [loadingRef, setLoadingRef] = useState({
    departments: false,
    subDepartments: false,
    positions: false,
    shifts: false,
  });
  
  const [contractModalOpen, setContractModalOpen] = useState(false);
  
  // Form
  const form = useForm<EmployeeEditFormValues>({
    resolver: zodResolver(employeeEditSchema),
    defaultValues: {
      personalInfo: {
        name: "",
        email: "",
        gender: "",
        address: "",
      },
      departmentInfo: {
        departmentId: "",
        subDepartmentId: "",
        positionId: "",
        shiftId: "",
      },
      contractInfo: {
        contractType: "",
        contractNumber: "",
        contractStartDate: "",
        contractEndDate: "",
      },
    },
  });
  
  // Fungsi untuk mengambil data karyawan
  const fetchEmployeeData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/employees/${employeeId}`);
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setEmployee(data);
      
      // Set form values
      form.setValue("personalInfo.name", data.user.name);
      form.setValue("personalInfo.email", data.user.email);
      form.setValue("personalInfo.gender", data.gender || "");
      form.setValue("personalInfo.address", data.address || "");
      
      form.setValue("departmentInfo.departmentId", data.departmentId);
      form.setValue("departmentInfo.subDepartmentId", data.subDepartmentId || "");
      form.setValue("departmentInfo.positionId", data.positionId || "");
      form.setValue("departmentInfo.shiftId", data.shiftId);
      
      form.setValue("contractInfo.contractType", data.contractType);
      form.setValue("contractInfo.contractNumber", data.contractNumber || "");
      form.setValue("contractInfo.contractStartDate", 
        data.contractStartDate ? new Date(data.contractStartDate).toISOString().split('T')[0] : "");
      form.setValue("contractInfo.contractEndDate", 
        data.contractEndDate ? new Date(data.contractEndDate).toISOString().split('T')[0] : "");
      
    } catch (error) {
      console.error("Error fetching employee:", error);
      setError(`Terjadi kesalahan: ${error instanceof Error ? error.message : "Unknown error"}`);
      toast.error("Gagal memuat data karyawan");
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch employee data
  useEffect(() => {
    if (employeeId) {
      fetchEmployeeData();
      fetchDepartments();
      fetchPositions();
      fetchShifts();
    }
  }, [employeeId]);
  
  // Fetch departments
  const fetchDepartments = async () => {
    try {
      setLoadingRef(prev => ({ ...prev, departments: true }));
      const response = await fetch("/api/departments");
      if (!response.ok) {
        throw new Error("Gagal mengambil data departemen");
      }
      const data = await response.json();
      setDepartments(data);
    } catch (error) {
      console.error("Error fetching departments:", error);
      toast.error("Gagal memuat data departemen");
    } finally {
      setLoadingRef(prev => ({ ...prev, departments: false }));
    }
  };
  
  // Fetch sub departments when department changes
  useEffect(() => {
    const departmentId = form.watch("departmentInfo.departmentId");
    if (departmentId) {
      fetchSubDepartments(departmentId);
      
      // Reset subDepartmentId dan shiftId ketika departemen berubah
      form.setValue("departmentInfo.subDepartmentId", "");
      form.setValue("departmentInfo.shiftId", "");
      
      // Load shift global (tidak terkait sub-departemen)
      fetchShifts();
    }
  }, [form.watch("departmentInfo.departmentId")]);
  
  // Fetch sub departments
  const fetchSubDepartments = async (departmentId: string) => {
    try {
      setLoadingRef(prev => ({ ...prev, subDepartments: true }));
      const response = await fetch(`/api/sub-departments?departmentId=${departmentId}`);
      if (!response.ok) {
        throw new Error("Gagal mengambil data sub departemen");
      }
      const data = await response.json();
      setSubDepartments(data);
    } catch (error) {
      console.error("Error fetching sub departments:", error);
      toast.error("Gagal memuat data sub departemen");
    } finally {
      setLoadingRef(prev => ({ ...prev, subDepartments: false }));
    }
  };
  
  // Fetch positions
  const fetchPositions = async () => {
    try {
      setLoadingRef(prev => ({ ...prev, positions: true }));
      const response = await fetch("/api/positions");
      if (!response.ok) {
        throw new Error("Gagal mengambil data posisi");
      }
      const data = await response.json();
      setPositions(data);
    } catch (error) {
      console.error("Error fetching positions:", error);
      toast.error("Gagal memuat data posisi");
    } finally {
      setLoadingRef(prev => ({ ...prev, positions: false }));
    }
  };
  
  // Fetch shifts
  const fetchShifts = async (subDepartmentId?: string) => {
    try {
      setLoadingRef(prev => ({ ...prev, shifts: true }));
      
      // Buat URL dengan parameter subDepartmentId jika tersedia
      let url = "/api/shifts";
      if (subDepartmentId) {
        url += `?subDepartmentId=${subDepartmentId}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Gagal mengambil data shift");
      }
      
      const data = await response.json();
      
      // Jika ada subDepartmentId, filter shift yang cocok dengan sub-departemen
      // atau shift yang tidak terkait dengan sub-departemen manapun (global)
      if (subDepartmentId) {
        const filteredData = data.filter(
          (shift: Shift) => shift.subDepartmentId === subDepartmentId || shift.subDepartmentId === null
        );
        setShifts(filteredData);
      } else {
        // Jika tidak ada subDepartmentId, tampilkan semua shift
        setShifts(data);
      }
    } catch (error) {
      console.error("Error fetching shifts:", error);
      toast.error("Gagal memuat data shift");
    } finally {
      setLoadingRef(prev => ({ ...prev, shifts: false }));
    }
  };
  
  // Fetch shifts when subDepartment changes
  useEffect(() => {
    const subDepartmentId = form.watch("departmentInfo.subDepartmentId");
    
    // Jika ada subDepartmentId, fetch shift berdasarkan sub-departemen
    if (subDepartmentId) {
      fetchShifts(subDepartmentId);
    } else {
      // Jika subDepartmentId kosong, fetch semua shift atau shift global
      fetchShifts();
    }
    
    // Reset shift ketika sub-departemen berubah
    form.setValue("departmentInfo.shiftId", "");
  }, [form.watch("departmentInfo.subDepartmentId")]);
  
  // Handle form submission
  const onSubmit = async (data: EmployeeEditFormValues) => {
    try {
      setSubmitting(true);
      
      // Format data for API
      const formattedData = {
        // User data
        name: data.personalInfo.name,
        email: data.personalInfo.email,
        
        // Employee data
        departmentId: data.departmentInfo.departmentId,
        subDepartmentId: data.departmentInfo.subDepartmentId || null,
        positionId: data.departmentInfo.positionId || null,
        shiftId: data.departmentInfo.shiftId,
        contractType: data.contractInfo.contractType,
        contractNumber: data.contractInfo.contractNumber || null,
        contractStartDate: data.contractInfo.contractStartDate,
        contractEndDate: data.contractInfo.contractEndDate || null,
        gender: data.personalInfo.gender,
        address: data.personalInfo.address || null,
      };
      
      // Send update request
      const response = await fetch(`/api/employees/${employeeId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formattedData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Gagal memperbarui data karyawan");
      }
      
      toast.success("Data karyawan berhasil diperbarui");
      router.push(`/employee/${employeeId}`);
      
    } catch (error) {
      console.error("Error updating employee:", error);
      toast.error(`Gagal memperbarui data karyawan: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setSubmitting(false);
    }
  };
  
  // Handler untuk mengubah kontrak dan mencatat riwayat
  const handleContractChange = async (data: ContractChangeFormValues, employeeId: string) => {
    try {
      console.log(`Updating contract for employee ${employeeId} with data:`, data);
      
      // Kirim permintaan ke endpoint contract-status
      const response = await fetch(`/api/employees/${employeeId}/contract-status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      const responseData = await response.json();
      
      // Penanganan error yang lebih robust
      if (!response.ok) {
        let errorMessage = 'Gagal mengubah kontrak';
        
        if (responseData && responseData.error) {
          errorMessage = responseData.error;
        }
        
        throw new Error(errorMessage);
      }
      
      toast.success('Kontrak berhasil diubah');
      fetchEmployeeData(); // Refresh data
      setContractModalOpen(false);
    } catch (error: unknown) {
      console.error('Error updating contract:', error);
      const errorMessage = error instanceof Error ? error.message : 'Gagal mengubah kontrak';
      toast.error(errorMessage);
      throw error; // Re-throw untuk ditangkap oleh modal
    }
  };
  
  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Memuat data karyawan...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button className="mt-4" onClick={() => router.back()}>
          Kembali
        </Button>
      </div>
    );
  }
  
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Edit Karyawan: {employee?.user.name}</h1>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="personal">Informasi Pribadi</TabsTrigger>
          <TabsTrigger value="department">Departemen & Posisi</TabsTrigger>
          <TabsTrigger value="contract">Kontrak</TabsTrigger>
        </TabsList>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6">
            <TabsContent value="personal">
              <Card>
                <CardHeader>
                  <CardTitle>Informasi Pribadi</CardTitle>
                  <CardDescription>
                    Edit informasi pribadi karyawan
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="personalInfo.name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nama Lengkap</FormLabel>
                          <FormControl>
                            <Input placeholder="Masukkan nama lengkap" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="personalInfo.email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="Masukkan email" type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="personalInfo.gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Jenis Kelamin</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Pilih jenis kelamin" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="MALE">Laki-laki</SelectItem>
                              <SelectItem value="FEMALE">Perempuan</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="personalInfo.address"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Alamat</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Masukkan alamat lengkap" 
                              className="min-h-[100px]" 
                              {...field} 
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="department">
              <Card>
                <CardHeader>
                  <CardTitle>Departemen & Posisi</CardTitle>
                  <CardDescription>
                    Edit informasi departemen dan posisi karyawan
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="departmentInfo.departmentId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Departemen</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value}
                          >
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
                    
                    <FormField
                      control={form.control}
                      name="departmentInfo.subDepartmentId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sub Departemen</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value}
                            disabled={!form.watch("departmentInfo.departmentId") || loadingRef.subDepartments}
                          >
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
                    
                    <FormField
                      control={form.control}
                      name="departmentInfo.positionId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Posisi</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Pilih posisi" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {positions.map((position) => (
                                <SelectItem key={position.id} value={position.id}>
                                  {position.name}
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
                      name="departmentInfo.shiftId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Shift</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Pilih shift" />
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
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="contract">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Informasi Kontrak</CardTitle>
                    <CardDescription>
                      Edit informasi kontrak karyawan
                    </CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => setContractModalOpen(true)}
                  >
                    Ubah Kontrak
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="contractInfo.contractType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipe Kontrak</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value}
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
                      name="contractInfo.contractNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nomor Kontrak</FormLabel>
                          <FormControl>
                            <Input placeholder="Masukkan nomor kontrak" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="contractInfo.contractStartDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tanggal Mulai Kontrak</FormLabel>
                          <FormControl>
                            <Input 
                              type="date" 
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="contractInfo.contractEndDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tanggal Berakhir Kontrak</FormLabel>
                          <FormControl>
                            <Input 
                              type="date" 
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={submitting}
                className="w-full md:w-auto"
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Simpan Perubahan
              </Button>
            </div>
          </form>
        </Form>
      </Tabs>
      
      {/* Modal untuk mengubah kontrak */}
      {employee && (
        <ContractChangeModal
          open={contractModalOpen}
          onOpenChange={setContractModalOpen}
          employeeName={employee.user?.name}
          employeeId={employee.id}
          currentContractType={employee.contractType === "PERMANENT" ? "Permanen" : "Training"}
          onSubmit={handleContractChange}
        />
      )}
    </div>
  );
} 