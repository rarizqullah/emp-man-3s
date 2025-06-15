"use client";

import { useEffect, useState, useRef } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { parseISO, isValid, isBefore, addMonths, format } from "date-fns";
import { UploadCloud, Camera, X, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Gender } from "@prisma/client";

// Interface untuk departemen, sub-departemen dan posisi
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

// Sekitar baris 29, tambahkan interface untuk Shift
interface Shift {
  id: string;
  name: string;
  shiftType: string;
  subDepartmentId: string | null;
  mainWorkStart?: string | null;
  mainWorkEnd?: string | null;
  subDepartment?: {
    id: string;
    name: string;
  } | null;
}

// Schema validasi untuk form karyawan
const employeeFormSchema = z.object({
  personalInfo: z.object({
    name: z.string().min(3, { message: "Nama harus diisi minimal 3 karakter" }),
    email: z.string().email({ message: "Format email tidak valid" }),
    phone: z.string().min(10, { message: "Nomor telepon minimal 10 digit" }),
    address: z.string().min(5, { message: "Alamat harus diisi minimal 5 karakter" }),
    idNumber: z.string().min(10, { message: "Nomor identitas harus diisi minimal 10 karakter" }),
    positionId: z.string().min(1, { message: "Jabatan harus dipilih" }),
    gender: z.nativeEnum(Gender),
  }),
  departmentInfo: z.object({
    department: z.string().min(1, { message: "Departemen harus dipilih" }),
    subDepartment: z.string().min(1, { message: "Sub departemen harus dipilih" }),
    shift: z.string().min(1, { message: "Shift harus dipilih" }),
  }),
  contractInfo: z.object({
    contractType: z.string().min(1, { message: "Tipe kontrak harus dipilih" }),
    contractNumber: z.string().optional(),
    trainingNumber: z.string().optional(),
    contractStartDate: z.date({ required_error: "Tanggal mulai kontrak harus diisi" }),
    contractEndDate: z.date({ required_error: "Tanggal akhir kontrak harus diisi" }),
  }),
});

// Type untuk data karyawan
type EmployeeFormValues = z.infer<typeof employeeFormSchema>;

// Default values untuk form
const defaultValues: EmployeeFormValues = {
  personalInfo: {
    name: "",
    email: "",
    phone: "",
    address: "",
    idNumber: "",
    positionId: "",
    gender: Gender.MALE,
  },
  departmentInfo: {
    department: "",
    subDepartment: "",
    shift: "",
  },
  contractInfo: {
    contractType: "",
    contractNumber: "",
    trainingNumber: "",
    contractStartDate: new Date(),
    contractEndDate: new Date(new Date().setMonth(new Date().getMonth() + 3)),
  },
};

interface AddEmployeeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (data: unknown) => void;
  departments?: Department[];
  positions?: Position[];
}

export function AddEmployeeModal({ 
  open, 
  onOpenChange,
  onSubmit,
  departments: initialDepartments,
  positions: initialPositions
}: AddEmployeeModalProps) {
  const [activeTab, setActiveTab] = useState("personal");
  const [faceImage, setFaceImage] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  // State untuk input tanggal manual
  const [manualStartDate, setManualStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [manualEndDate, setManualEndDate] = useState(format(addMonths(new Date(), 3), 'yyyy-MM-dd'));
  
  // State untuk data dari API
  const [departments, setDepartments] = useState<Department[]>(initialDepartments || []);
  const [subDepartments, setSubDepartments] = useState<SubDepartment[]>([]);
  const [positions, setPositions] = useState<Position[]>(initialPositions || []);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [filteredSubDepartments, setFilteredSubDepartments] = useState<SubDepartment[]>([]);
  const [filteredShifts, setFilteredShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState({
    departments: false,
    subDepartments: false,
    positions: false,
    shifts: false
  });

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues,
  });

  // Fetch data dari API jika tidak ada data awal
  useEffect(() => {
    if (open) {
      if (!initialDepartments || initialDepartments.length === 0) {
        fetchDepartments();
      } else {
        setDepartments(initialDepartments);
      }
      
      if (!initialPositions || initialPositions.length === 0) {
        fetchPositions();
      } else {
        setPositions(initialPositions);
      }
      
      fetchSubDepartments();
      fetchShifts();
    } else {
      // Reset form saat modal ditutup
      form.reset(defaultValues);
      setFaceImage(null);
      setActiveTab("personal");
      stopCamera();
    }
  }, [open, initialDepartments, initialPositions]);

  // Fetch departemen
  const fetchDepartments = async () => {
    try {
      setLoading(prev => ({ ...prev, departments: true }));
      const response = await fetch('/api/departments');
      if (!response.ok) {
        throw new Error('Gagal mengambil data departemen');
      }
      const data = await response.json();
      setDepartments(data);
    } catch (error) {
      console.error('Error fetching departments:', error);
      toast.error('Gagal mengambil data departemen');
    } finally {
      setLoading(prev => ({ ...prev, departments: false }));
    }
  };

  // Fetch sub-departemen
  const fetchSubDepartments = async () => {
    try {
      setLoading(prev => ({ ...prev, subDepartments: true }));
      const response = await fetch('/api/sub-departments');
      if (!response.ok) {
        throw new Error('Gagal mengambil data sub-departemen');
      }
      const data = await response.json();
      setSubDepartments(data);
    } catch (error) {
      console.error('Error fetching sub-departments:', error);
      toast.error('Gagal mengambil data sub-departemen');
    } finally {
      setLoading(prev => ({ ...prev, subDepartments: false }));
    }
  };

  // Fetch posisi
  const fetchPositions = async () => {
    try {
      setLoading(prev => ({ ...prev, positions: true }));
      const response = await fetch('/api/positions');
      if (!response.ok) {
        throw new Error('Gagal mengambil data jabatan');
      }
      const data = await response.json();
      setPositions(data);
    } catch (error) {
      console.error('Error fetching positions:', error);
      toast.error('Gagal mengambil data jabatan');
    } finally {
      setLoading(prev => ({ ...prev, positions: false }));
    }
  };

  // Fetch shifts
  const fetchShifts = async (subDepartmentId?: string, retryCount = 0) => {
    try {
      setLoading(prev => ({ ...prev, shifts: true }));
      console.log(`Mengambil data shift (percobaan ${retryCount + 1})...`);
      
      // Buat URL dengan parameter subDepartmentId jika tersedia
      let url = '/api/shifts';
      if (subDepartmentId) {
        url += `?subDepartmentId=${subDepartmentId}`;
      }
      
      const response = await fetch(url, {
        // Tambahkan timeout dan cache control
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        // Parse error response untuk mendapatkan informasi yang lebih detail
        let errorMessage = 'Gagal mengambil data shift';
        try {
          const errorData = await response.json() as { error?: string; isConnectionError?: boolean };
          if (errorData.error) {
            errorMessage = errorData.error;
          }
          
          // Jika error karena koneksi database dan masih ada retry
          if (errorData.isConnectionError && retryCount < 2) {
            console.log(`Koneksi database terputus, mencoba ulang dalam 3 detik... (${retryCount + 1}/3)`);
            await new Promise(resolve => setTimeout(resolve, 3000));
            return fetchShifts(subDepartmentId, retryCount + 1);
          }
        } catch (parseError) {
          console.error('Error parsing error response:', parseError);
        }
        
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      
      // Validasi data response
      if (!Array.isArray(data)) {
        throw new Error('Data shift tidak valid');
      }
      
      console.log(`Berhasil mengambil ${data.length} shift`);
      setShifts(data);
      
      // Filter shifts jika ada subDepartmentId
      if (subDepartmentId) {
        const filtered = data.filter(
          (shift: Shift) => shift.subDepartmentId === subDepartmentId || shift.subDepartmentId === null
        );
        setFilteredShifts(filtered);
        console.log(`Filtered ${filtered.length} shift untuk subDepartmentId: ${subDepartmentId}`);
      } else {
        // Jika tidak ada subDepartmentId, tampilkan shift yang tidak terkait dengan sub-departemen
        const filtered = data.filter((shift: Shift) => shift.subDepartmentId === null);
        setFilteredShifts(filtered);
        console.log(`Filtered ${filtered.length} shift global`);
      }
    } catch (error) {
      console.error('Error fetching shifts:', error);
      
      // Jika masih ada retry untuk network error dan bukan connection error yang sudah dihandle
      if (retryCount < 2 && error instanceof Error && 
          (error.message.includes('fetch') || error.message.includes('network'))) {
        console.log(`Network error, mencoba ulang dalam 2 detik... (${retryCount + 1}/3)`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return fetchShifts(subDepartmentId, retryCount + 1);
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan saat mengambil data shift';
      toast.error(errorMessage);
      
      // Set data dummy jika koneksi database bermasalah
      const fallbackShifts: Shift[] = [
        {
          id: "fallback-1",
          name: "Non-Shift (Fallback)",
          shiftType: "NON_SHIFT",
          subDepartmentId: null,
          mainWorkStart: "08:00:00",
          mainWorkEnd: "17:00:00",
        }
      ];
      
      console.log('Menggunakan data shift fallback');
      setShifts(fallbackShifts);
      setFilteredShifts(fallbackShifts);
    } finally {
      setLoading(prev => ({ ...prev, shifts: false }));
    }
  };
  
  // Filter sub-departemen berdasarkan departemen yang dipilih
  useEffect(() => {
    const departmentId = form.watch('departmentInfo.department');
    
    if (departmentId) {
      // Filter subDepartments berdasarkan departmentId
      const filtered = subDepartments.filter(
        subDept => subDept.departmentId === departmentId
      );
      setFilteredSubDepartments(filtered);
      
      // Reset nilai sub-departemen jika departemen berubah
      if (form.getValues('departmentInfo.subDepartment')) {
        const currentSubDept = filtered.find(
          subDept => subDept.id === form.getValues('departmentInfo.subDepartment')
        );
        if (!currentSubDept) {
          form.setValue('departmentInfo.subDepartment', '');
          // Reset shift jika sub-departemen berubah
          form.setValue('departmentInfo.shift', '');
        }
      }
    } else {
      setFilteredSubDepartments([]);
      // Reset shift jika departemen kosong
      form.setValue('departmentInfo.shift', '');
    }
  }, [form.watch('departmentInfo.department'), subDepartments]);

  // Mengambil shift berdasarkan sub-departemen yang dipilih
  useEffect(() => {
    const subDepartmentId = form.watch('departmentInfo.subDepartment');
    
    if (subDepartmentId) {
      // Fetch shifts berdasarkan subDepartmentId
      fetchShifts(subDepartmentId);
    } else {
      // Jika tidak ada sub-departemen yang dipilih, ambil shifts global
      fetchShifts();
      // Reset shift jika sub-departemen kosong
      form.setValue('departmentInfo.shift', '');
    }
  }, [form.watch('departmentInfo.subDepartment')]);

  // Setelah ambil data shift, filter berdasarkan sub-departemen
  useEffect(() => {
    const subDepartmentId = form.watch('departmentInfo.subDepartment');
    
    if (subDepartmentId) {
      // Filter shifts berdasarkan subDepartmentId atau tanpa subDepartmentId
      const filtered = shifts.filter(
        shift => shift.subDepartmentId === subDepartmentId || 
                shift.subDepartmentId === null
      );
      setFilteredShifts(filtered);
      
      // Reset nilai shift jika sub-departemen berubah
      if (form.getValues('departmentInfo.shift')) {
        const currentShift = filtered.find(
          shift => shift.id === form.getValues('departmentInfo.shift')
        );
        if (!currentShift) {
          form.setValue('departmentInfo.shift', '');
        }
      }
    } else {
      // Jika tidak ada sub-departemen yang dipilih, tampilkan shift yang tidak terkait dengan sub-departemen
      const filtered = shifts.filter(shift => shift.subDepartmentId === null);
      setFilteredShifts(filtered);
    }
  }, [shifts, form.watch('departmentInfo.subDepartment')]);

  const handleSubmit = (data: EmployeeFormValues) => {
    try {
      console.log("Form data to submit:", data);
      
      // Validasi tanggal kontrak
      const { contractStartDate, contractEndDate } = data.contractInfo;
      if (contractEndDate && contractStartDate > contractEndDate) {
        toast.error("Tanggal berakhir kontrak tidak boleh sebelum tanggal mulai kontrak");
        return;
      }
      
      // Validasi data wajah jika diperlukan
      if (!faceImage) {
        toast.warning("Data wajah belum diisi. Pastikan ini opsional untuk aplikasi Anda.");
      }
      
      // Siapkan data dalam format yang datar/flat sesuai dengan yang diharapkan handleAddEmployee
      const formattedData = {
        // Data personal
        name: data.personalInfo.name,
        email: data.personalInfo.email,
        phone: data.personalInfo.phone,
        idNumber: data.personalInfo.idNumber,
        positionId: data.personalInfo.positionId, // Ambil dari personalInfo
        gender: data.personalInfo.gender,
        address: data.personalInfo.address,
        
        // Data departemen
        department: data.departmentInfo.department,
        subDepartment: data.departmentInfo.subDepartment,
        shift: data.departmentInfo.shift,
        
        // Data kontrak
        contractType: data.contractInfo.contractType,
        contractNumber: data.contractInfo.contractNumber || null,
        contractStartDate: data.contractInfo.contractStartDate,
        contractEndDate: data.contractInfo.contractEndDate,
        
        // Data tambahan
        faceData: faceImage
      };
      
      console.log("Formatted data for API:", formattedData);
      
      // Panggil callback onSubmit jika tersedia
      if (onSubmit) {
        onSubmit(formattedData);
      }
      
      // Reset form dan state setelah submit berhasil
      form.reset();
      setFaceImage(null);
      setActiveTab("personal");
      onOpenChange(false);
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Terjadi kesalahan saat menyimpan data karyawan");
    }
  };

  // Fungsi untuk mengambil gambar dari kamera
  const captureImage = () => {
    if (!videoRef.current) {
      toast.error("Video belum siap. Tunggu sebentar atau coba refresh.");
      return;
    }
    
    try {
      const video = videoRef.current;
      
      // Pastikan video sudah dimuat dan sedang diputar
      if (video.readyState !== 4) {
        toast.error("Video belum siap. Tunggu beberapa saat lagi.");
        return;
      }
      
      // Buat canvas dengan ukuran video
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Dapatkan konteks 2D canvas
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        toast.error("Tidak dapat membuat konteks canvas");
        return;
      }
      
      // Gambar video ke canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Konversi canvas ke data URL (base64)
      try {
        const dataUrl = canvas.toDataURL("image/png");
        setFaceImage(dataUrl);
        stopCamera();
      } catch (e) {
        console.error("Error converting canvas to data URL:", e);
        toast.error("Gagal mengambil foto. Silakan coba lagi.");
      }
    } catch (error) {
      console.error("Error capturing image:", error);
      toast.error("Gagal mengambil foto. Silakan coba lagi.");
    }
  };

  // Fungsi untuk menonaktifkan kamera
  const stopCamera = () => {
    if (videoStream) {
      videoStream.getTracks().forEach(track => {
        track.stop();
      });
      setVideoStream(null);
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setCameraActive(false);
  };

  // Fungsi untuk menghapus gambar wajah
  const removeImage = () => {
    setFaceImage(null);
  };

  // Handle perubahan tab
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    // Jika beralih ke tab data wajah, siapkan kamera
    if (value === "face" && !faceImage && !cameraActive && !cameraError) {
      // Tidak perlu memulai kamera di sini
      // Biarkan pengguna memulai kamera sendiri dengan tombol
    }
  };

  // Komponen ini harus dibersihkan saat unmount
  useEffect(() => {
    return () => {
      // Matikan kamera saat komponen di-unmount
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [videoStream]);

  // Fungsi untuk menangani perubahan tanggal manual
  const handleManualDateChange = (field: 'startDate' | 'endDate', value: string) => {
    try {
      const dateValue = parseISO(value);
      
      // Validasi tanggal
      if (isValid(dateValue)) {
        if (field === 'startDate') {
          setManualStartDate(value);
          
          // Update form field
          form.setValue('contractInfo.contractStartDate', dateValue);
          
          // Jika end date sebelum start date, sesuaikan end date
          const endDate = form.getValues("contractInfo.contractEndDate");
          if (endDate && isBefore(endDate, dateValue)) {
            const newEndDate = addMonths(dateValue, 3);
            form.setValue("contractInfo.contractEndDate", newEndDate);
            setManualEndDate(format(newEndDate, 'yyyy-MM-dd'));
          }
        } else {
          setManualEndDate(value);
          
          // Update form field
          form.setValue("contractInfo.contractEndDate", dateValue);
        }
      }
    } catch (error) {
      console.error('Error parsing date:', error);
    }
  };

  // Format jam kerja dalam format 24 jam (HH:MM)
  const formatTimeOnly = (timeString: string | null) => {
    if (!timeString) return '—';
    try {
      // Ambil hanya bagian HH:MM dari string waktu
      const time = new Date(timeString);
      return time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return '—';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tambah Karyawan Baru</DialogTitle>
          <DialogDescription>
            Isi data karyawan dengan lengkap untuk menambahkan karyawan baru ke sistem
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="personal">Informasi Pribadi</TabsTrigger>
            <TabsTrigger value="department">Departemen</TabsTrigger>
            <TabsTrigger value="contract">Kontrak</TabsTrigger>
            <TabsTrigger value="face">Data Wajah</TabsTrigger>
          </TabsList>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)}>
              <TabsContent value="personal" className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
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
                    name="personalInfo.phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nomor Telepon</FormLabel>
                        <FormControl>
                          <Input placeholder="Masukkan nomor telepon" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="personalInfo.idNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nomor Identitas (KTP/SIM)</FormLabel>
                        <FormControl>
                          <Input placeholder="Masukkan nomor identitas" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="personalInfo.positionId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Jabatan</FormLabel>
                        <FormControl>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value}
                            disabled={loading.positions || positions.length === 0}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih jabatan" />
                            </SelectTrigger>
                            <SelectContent>
                              {loading.positions ? (
                                <div className="flex items-center justify-center p-2">
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  <span>Memuat...</span>
                                </div>
                              ) : positions.length === 0 ? (
                                <div className="p-2 text-center text-muted-foreground">
                                  Tidak ada data jabatan
                                </div>
                              ) : (
                                positions.map((position) => (
                                  <SelectItem key={position.id} value={position.id}>
                                    {position.name}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
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
                        <FormControl>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih jenis kelamin" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={Gender.MALE}>Laki-laki</SelectItem>
                              <SelectItem value={Gender.FEMALE}>Perempuan</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="personalInfo.address"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Alamat</FormLabel>
                        <FormControl>
                          <Input placeholder="Masukkan alamat lengkap" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="flex justify-end">
                  <Button type="button" onClick={() => handleTabChange("department")}>
                    Selanjutnya
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="department" className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="departmentInfo.department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Departemen</FormLabel>
                        <FormControl>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value}
                            disabled={loading.departments || departments.length === 0}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih departemen" />
                            </SelectTrigger>
                            <SelectContent>
                              {loading.departments ? (
                                <div className="flex items-center justify-center p-2">
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  <span>Memuat...</span>
                                </div>
                              ) : departments.length === 0 ? (
                                <div className="p-2 text-center text-muted-foreground">
                                  Tidak ada data departemen
                                </div>
                              ) : (
                                departments.map((department) => (
                                  <SelectItem key={department.id} value={department.id}>
                                    {department.name}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="departmentInfo.subDepartment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sub Departemen</FormLabel>
                        <FormControl>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value}
                            disabled={loading.subDepartments || !form.watch('departmentInfo.department') || filteredSubDepartments.length === 0}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih sub departemen" />
                            </SelectTrigger>
                            <SelectContent>
                              {loading.subDepartments ? (
                                <div className="flex items-center justify-center p-2">
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  <span>Memuat...</span>
                                </div>
                              ) : !form.watch('departmentInfo.department') ? (
                                <div className="p-2 text-center text-muted-foreground">
                                  Pilih departemen terlebih dahulu
                                </div>
                              ) : filteredSubDepartments.length === 0 ? (
                                <div className="p-2 text-center text-muted-foreground">
                                  Tidak ada sub departemen
                                </div>
                              ) : (
                                filteredSubDepartments.map((subDept) => (
                                  <SelectItem key={subDept.id} value={subDept.id}>
                                    {subDept.name}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="departmentInfo.shift"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Shift</FormLabel>
                        <FormControl>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value}
                            disabled={loading.shifts || !form.watch('departmentInfo.subDepartment') || filteredShifts.length === 0}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih shift" />
                            </SelectTrigger>
                            <SelectContent>
                              {loading.shifts ? (
                                <div className="flex items-center justify-center p-2">
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  <span>Memuat...</span>
                                </div>
                              ) : !form.watch('departmentInfo.subDepartment') ? (
                                <div className="p-2 text-center text-muted-foreground">
                                  Pilih sub departemen terlebih dahulu
                                </div>
                              ) : filteredShifts.length === 0 ? (
                                <div className="p-2 text-center text-muted-foreground">
                                  Tidak ada shift tersedia
                                </div>
                              ) : (
                                filteredShifts.map((shift) => {
                                  // Buat label jam kerja utama
                                  const mainWorkLabel = shift.mainWorkStart && shift.mainWorkEnd 
                                    ? `${formatTimeOnly(shift.mainWorkStart)}-${formatTimeOnly(shift.mainWorkEnd)}`
                                    : 'Jam tidak tersedia';
                                  
                                  // Tampilkan jenis shift dan informasi dari subDepartment
                                  const subDeptInfo = shift.subDepartmentId 
                                    ? ` - ${shift.subDepartment?.name || 'Sub Dept'}`
                                    : ' - Global';
                                    
                                  return (
                                    <SelectItem key={shift.id} value={shift.id} className="py-2">
                                      <div>
                                        <div className="font-medium">{shift.name}</div>
                                        <div className="text-xs text-muted-foreground flex items-center">
                                          <span className="mr-2">{mainWorkLabel}</span>
                                          <span className="text-xs">{subDeptInfo}</span>
                                        </div>
                                      </div>
                                    </SelectItem>
                                  );
                                })
                              )}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="flex justify-between">
                  <Button type="button" variant="outline" onClick={() => handleTabChange("personal")}>
                    Sebelumnya
                  </Button>
                  <Button type="button" onClick={() => handleTabChange("contract")}>
                    Selanjutnya
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="contract" className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="contractInfo.contractType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Jenis Kontrak</FormLabel>
                        <FormControl>
                          <Select 
                            onValueChange={(value) => {
                              field.onChange(value);
                              // Reset nomor kontrak/training saat jenis kontrak berubah
                              if (value === "Permanen") {
                                form.setValue("contractInfo.contractNumber", "");
                                form.setValue("contractInfo.trainingNumber", "");
                              } else if (value === "Training") {
                                form.setValue("contractInfo.contractNumber", "");
                                form.setValue("contractInfo.trainingNumber", "");
                              }
                            }} 
                            value={field.value}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih jenis kontrak" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Permanen">Karyawan Permanen</SelectItem>
                              <SelectItem value="Training">Karyawan Training</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {form.watch("contractInfo.contractType") === "Permanen" && (
                    <FormField
                      control={form.control}
                      name="contractInfo.contractNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nomor Kontrak</FormLabel>
                          <FormControl>
                            <Input placeholder="Masukkan nomor kontrak" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  
                  {form.watch("contractInfo.contractType") === "Training" && (
                    <FormField
                      control={form.control}
                      name="contractInfo.trainingNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nomor Training</FormLabel>
                          <FormControl>
                            <Input placeholder="Masukkan nomor training" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  
                  <div className="col-span-2">
                    <div className="mb-4">
                      <p className="text-sm text-muted-foreground mb-1">
                        <strong>Petunjuk:</strong> Masukkan tanggal dengan format YYYY-MM-DD (contoh: 2024-05-15)
                      </p>
                    </div>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="contractInfo.contractStartDate"
                    render={() => (
                      <FormItem className="col-span-1">
                        <FormLabel>Tanggal Mulai Kontrak</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            placeholder="YYYY-MM-DD"
                            value={manualStartDate}
                            onChange={(e) => handleManualDateChange('startDate', e.target.value)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="contractInfo.contractEndDate"
                    render={() => (
                      <FormItem className="col-span-1">
                        <FormLabel>Tanggal Berakhir Kontrak</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            placeholder="YYYY-MM-DD"
                            value={manualEndDate}
                            onChange={(e) => handleManualDateChange('endDate', e.target.value)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="flex justify-between">
                  <Button type="button" variant="outline" onClick={() => handleTabChange("department")}>
                    Sebelumnya
                  </Button>
                  <Button type="button" onClick={() => handleTabChange("face")}>
                    Selanjutnya
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="face" className="mt-4 space-y-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <Label className="text-center mb-2">
                        Foto Wajah Karyawan untuk Pengenalan Wajah
                      </Label>
                      
                      {!faceImage && !cameraActive && (
                        <div className="flex flex-wrap gap-4 justify-center">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => {
                              // Atur state terlebih dahulu
                              setCameraActive(true);
                              setCameraError(null);
                              
                              // Gunakan setTimeout untuk memastikan DOM dirender terlebih dahulu
                              setTimeout(() => {
                                try {
                                  // Pastikan browser mendukung API media
                                  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                                    throw new Error("Browser Anda tidak mendukung API akses kamera");
                                  }
                                  
                                  // Pastikan elemen video sudah ada
                                  if (!videoRef.current) {
                                    throw new Error("Tidak dapat menemukan elemen video");
                                  }
                                  
                                  // Minta akses kamera
                                  navigator.mediaDevices.getUserMedia({ 
                                    video: { 
                                      width: { ideal: 640 },
                                      height: { ideal: 480 },
                                      facingMode: "user" 
                                    } 
                                  })
                                  .then(stream => {
                                    if (!videoRef.current) return;
                                    
                                    // Set state dan element
                                    setVideoStream(stream);
                                    videoRef.current.srcObject = stream;
                                    
                                    // Putar video
                                    videoRef.current.play().catch(e => {
                                      console.error("Error playing video:", e);
                                      toast.error("Tidak dapat memulai video stream");
                                    });
                                  })
                                  .catch(err => {
                                    console.error("Error accessing camera:", err);
                                    let errorMessage = "Tidak dapat mengakses kamera";
                                    
                                    if (err instanceof DOMException) {
                                      if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                                        errorMessage = "Kamera tidak ditemukan";
                                      } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                                        errorMessage = "Akses kamera ditolak";
                                      }
                                    } else if (err instanceof Error) {
                                      errorMessage = err.message;
                                    }
                                    
                                    setCameraError(errorMessage);
                                    toast.error(errorMessage);
                                    setCameraActive(false);
                                  });
                                  
                                } catch (error) {
                                  console.error("Error setting up camera:", error);
                                  const errorMessage = error instanceof Error ? error.message : "Tidak dapat mengakses kamera";
                                  setCameraError(errorMessage);
                                  toast.error(errorMessage);
                                  setCameraActive(false);
                                }
                              }, 300);
                            }}
                            className="flex gap-2"
                          >
                            <Camera className="h-4 w-4" />
                            Ambil Foto dengan Kamera
                          </Button>
                          
                          <div className="relative">
                            <Label 
                              htmlFor="faceUpload" 
                              className="flex gap-2 h-10 px-4 py-2 bg-white text-sm rounded-md border border-input cursor-pointer items-center hover:bg-accent"
                            >
                              <UploadCloud className="h-4 w-4" />
                              <span>Upload Foto</span>
                            </Label>
                            <Input 
                              id="faceUpload"
                              type="file" 
                              accept="image/*"
                              className="sr-only"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = (event) => {
                                    if (event.target?.result) {
                                      setFaceImage(event.target.result.toString());
                                    }
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </div>
                        </div>
                      )}
                      
                      {cameraActive && (
                        <div className="relative border rounded-md overflow-hidden w-full max-w-md mx-auto">
                          <div className="aspect-video relative bg-black flex items-center justify-center">
                            <video 
                              ref={videoRef}
                              autoPlay 
                              playsInline
                              muted
                              className="w-full h-full object-cover"
                              style={{ transform: 'scaleX(-1)' }} // Mirror effect
                            />
                            
                            {/* Loading overlay */}
                            {cameraActive && !videoStream && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                <Loader2 className="h-8 w-8 animate-spin text-white" />
                                <span className="text-white ml-2">Menyiapkan kamera...</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                            <Button 
                              type="button" 
                              onClick={captureImage}
                              className="bg-primary/90 hover:bg-primary"
                              disabled={!videoStream}
                            >
                              Ambil Foto
                            </Button>
                            
                            <Button 
                              type="button" 
                              variant="destructive"
                              onClick={stopCamera}
                              className="bg-destructive/90 hover:bg-destructive px-4 py-2"
                            >
                              Batal
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      {faceImage && (
                        <div className="relative w-full max-w-md mx-auto">
                          <img 
                            src={faceImage} 
                            alt="Face preview" 
                            className="w-full h-auto border rounded-md" 
                            style={{ transform: 'scaleX(-1)' }} // Mirror effect
                          />
                          <Button 
                            type="button"
                            variant="destructive" 
                            size="icon"
                            className="absolute top-2 right-2"
                            onClick={removeImage}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      
                      {cameraError && !cameraActive && !faceImage && (
                        <div className="text-center p-4 border border-destructive bg-destructive/10 rounded-md text-destructive">
                          <p>{cameraError}</p>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              // Atur state terlebih dahulu
                              setCameraActive(true);
                              setCameraError(null);
                              
                              // Gunakan setTimeout untuk memastikan DOM dirender terlebih dahulu
                              setTimeout(() => {
                                try {
                                  // Pastikan browser mendukung API media
                                  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                                    throw new Error("Browser Anda tidak mendukung API akses kamera");
                                  }
                                  
                                  // Pastikan elemen video sudah ada
                                  if (!videoRef.current) {
                                    throw new Error("Tidak dapat menemukan elemen video");
                                  }
                                  
                                  // Minta akses kamera
                                  navigator.mediaDevices.getUserMedia({ 
                                    video: { 
                                      width: { ideal: 640 },
                                      height: { ideal: 480 },
                                      facingMode: "user" 
                                    } 
                                  })
                                  .then(stream => {
                                    if (!videoRef.current) return;
                                    
                                    // Set state dan element
                                    setVideoStream(stream);
                                    videoRef.current.srcObject = stream;
                                    
                                    // Putar video
                                    videoRef.current.play().catch(e => {
                                      console.error("Error playing video:", e);
                                      toast.error("Tidak dapat memulai video stream");
                                    });
                                  })
                                  .catch(err => {
                                    console.error("Error accessing camera:", err);
                                    let errorMessage = "Tidak dapat mengakses kamera";
                                    
                                    if (err instanceof DOMException) {
                                      if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                                        errorMessage = "Kamera tidak ditemukan";
                                      } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                                        errorMessage = "Akses kamera ditolak";
                                      }
                                    } else if (err instanceof Error) {
                                      errorMessage = err.message;
                                    }
                                    
                                    setCameraError(errorMessage);
                                    toast.error(errorMessage);
                                    setCameraActive(false);
                                  });
                                  
                                } catch (error) {
                                  console.error("Error setting up camera:", error);
                                  const errorMessage = error instanceof Error ? error.message : "Tidak dapat mengakses kamera";
                                  setCameraError(errorMessage);
                                  toast.error(errorMessage);
                                  setCameraActive(false);
                                }
                              }, 300);
                            }}
                            className="mt-2"
                          >
                            Coba Lagi
                          </Button>
                        </div>
                      )}
                      
                      <div className="text-sm text-muted-foreground mt-2 text-center">
                        <p>Foto wajah akan digunakan untuk absensi dengan pengenalan wajah.</p>
                        <p>Pastikan foto diambil dengan pencahayaan yang baik dan wajah terlihat jelas.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <div className="flex justify-between">
                  <Button type="button" variant="outline" onClick={() => handleTabChange("contract")}>
                    Sebelumnya
                  </Button>
                  <Button type="submit">Simpan Data Karyawan</Button>
                </div>
              </TabsContent>
            </form>
          </Form>
        </Tabs>
        
        <DialogFooter>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => onOpenChange(false)}
          >
            Batal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 