"use client";

// Tambahkan header khusus di awal file
// Fungsi ini membantu mencegah redirect otomatis ke halaman login
if (typeof window !== 'undefined') {
  window.__FORCE_STAY_ON_PAGE__ = true;
  console.log("[Permission Page] Flag __FORCE_STAY_ON_PAGE__ disetel ke true");
}

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { 
  Search, 
  FileDown, 
  PlusCircle,
  CheckCircle2,
  XCircle,
  Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "react-hot-toast";
import PermissionPageGuard from "@/components/auth/PermissionPageGuard";

// Tipe data untuk izin karyawan
interface Permission {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  position: string;
  permissionType: string;
  reason: string;
  startDate: string;
  endDate: string;
  duration: number;
  attachmentUrl?: string;
  status: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedReason?: string;
  createdAt: string;
  otherDetails?: string; // Detail tambahan untuk tipe izin "Lainnya"
}

// Interface untuk data karyawan dalam dropdown
interface Employee {
  id: string;
  name: string;
  departmentId: string;
  subDepartmentId?: string;
  position?: string;
}

// Interface untuk departemen
interface Department {
  id: string;
  name: string;
}

// Interface untuk sub-departemen
interface SubDepartment {
  id: string;
  name: string;
  departmentId: string;
}

// Interface untuk data karyawan dari API
interface EmployeeApiResponse {
  id: string;
  user: {
    name: string;
  };
  departmentId: string;
  subDepartmentId?: string;
  position?: {
    name: string;
  };
}

// Interface untuk data izin dari API
interface PermissionApiResponse {
  id: string;
  employee: {
    id: string;
    user: {
      name: string;
    };
    department?: {
      name: string;
    };
    position?: {
      name: string;
    };
  };
  type: string;
  reason: string;
  startDate: string;
  endDate: string;
  duration: number;
  attachment?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy?: {
    user?: {
      name: string;
    };
  };
  approvedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  otherDetails?: string;
}

// Format tanggal
const formatDate = (dateString: string) => {
  return format(new Date(dateString), "d MMMM yyyy", { locale: id });
};

// Format tanggal dan waktu
const formatDateTime = (dateString: string) => {
  return format(new Date(dateString), "d MMM yyyy, HH:mm", { locale: id });
};

function PermissionPageContent() {
  const [activeTab, setActiveTab] = useState("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterType, setFilterType] = useState("ALL");
  const [filteredData, setFilteredData] = useState<Permission[]>([]);
  const [permissionData, setPermissionData] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State untuk form pengajuan izin
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState<Permission | null>(null);
  
  // Form state untuk pengajuan izin baru
  const [permissionType, setPermissionType] = useState("VACATION");
  const [startDate, setStartDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [reason, setReason] = useState("");
  const [otherDetails, setOtherDetails] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  
  // State untuk data karyawan
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subDepartments, setSubDepartments] = useState<SubDepartment[]>([]);
  
  // Tambahkan state untuk menandai mode sample (tanpa data asli)
  const [sampleMode, setSampleMode] = useState(false);
  
  // Data contoh izin untuk digunakan saat terjadi error
  const samplePermissionData: Permission[] = [
    {
      id: "IP-001",
      employeeId: "EMP-001",
      employeeName: "Budi Santoso",
      department: "IT",
      position: "Software Developer",
      permissionType: "VACATION",
      reason: "Liburan keluarga",
      startDate: format(new Date(), "yyyy-MM-dd"),
      endDate: format(new Date(new Date().setDate(new Date().getDate() + 3)), "yyyy-MM-dd"),
      duration: 3,
      status: "Menunggu",
      createdAt: new Date().toISOString()
    },
    {
      id: "IP-002",
      employeeId: "EMP-002",
      employeeName: "Siti Aminah",
      department: "Marketing",
      position: "Marketing Manager",
      permissionType: "SICK",
      reason: "Demam dan flu",
      startDate: format(new Date(), "yyyy-MM-dd"),
      endDate: format(new Date(new Date().setDate(new Date().getDate() + 1)), "yyyy-MM-dd"),
      duration: 1,
      status: "Disetujui",
      approvedBy: "Admin",
      approvedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    },
    {
      id: "IP-003",
      employeeId: "EMP-003",
      employeeName: "Ahmad Hidayat",
      department: "Keuangan",
      position: "Akuntan",
      permissionType: "PERSONAL",
      reason: "Mengurus administrasi",
      startDate: format(new Date(), "yyyy-MM-dd"),
      endDate: format(new Date(), "yyyy-MM-dd"),
      duration: 1,
      status: "Ditolak",
      rejectedReason: "Terlalu banyak tugas mendesak yang harus diselesaikan",
      createdAt: new Date().toISOString()
    },
  ];
  
  // Data contoh karyawan
  const sampleEmployees: Employee[] = [
    { id: "EMP-001", name: "Budi Santoso", departmentId: "DEPT-001", position: "Software Developer" },
    { id: "EMP-002", name: "Siti Aminah", departmentId: "DEPT-002", position: "Marketing Manager" },
    { id: "EMP-003", name: "Ahmad Hidayat", departmentId: "DEPT-003", position: "Akuntan" },
    { id: "EMP-004", name: "Dewi Lestari", departmentId: "DEPT-001", position: "UI/UX Designer" },
    { id: "EMP-005", name: "Eko Prasetyo", departmentId: "DEPT-004", position: "HRD Manager" },
  ];
  
  // Data contoh departemen
  const sampleDepartments: Department[] = [
    { id: "DEPT-001", name: "IT" },
    { id: "DEPT-002", name: "Marketing" },
    { id: "DEPT-003", name: "Keuangan" },
    { id: "DEPT-004", name: "HRD" },
  ];
  
  // Data contoh sub-departemen
  const sampleSubDepartments: SubDepartment[] = [
    { id: "SUBDEPT-001", name: "Development", departmentId: "DEPT-001" },
    { id: "SUBDEPT-002", name: "Infrastructure", departmentId: "DEPT-001" },
    { id: "SUBDEPT-003", name: "Digital Marketing", departmentId: "DEPT-002" },
    { id: "SUBDEPT-004", name: "Accounting", departmentId: "DEPT-003" },
    { id: "SUBDEPT-005", name: "Recruitment", departmentId: "DEPT-004" },
  ];
  
  // Mengambil data izin, karyawan, departemen, dan sub-departemen
  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        setIsLoading(true);
        
        console.log("Fetching permissions...");
        
        // Coba fetch data dari API
        try {
          const response = await fetch(`/api/permissions?noRedirect=true`, {
            cache: "no-store",
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
            }
          });
          
          console.log("Permission response status:", response.status);
          
          if (!response.ok) {
            // Jika terjadi error auth, gunakan data contoh tapi jangan redirect
            console.log("Menggunakan data contoh karena response tidak OK");
            setPermissionData(samplePermissionData);
            setFilteredData(samplePermissionData);
            setSampleMode(true);
            return;
          }

          const data = await response.json();
          console.log("Permissions data:", data);
          
          // Transformasi data sesuai kebutuhan
          const transformedData = data.map((perm: PermissionApiResponse) => ({
            id: perm.id,
            employeeId: perm.employee.id,
            employeeName: perm.employee.user.name,
            department: perm.employee.department?.name || '-',
            position: perm.employee.position?.name || '-',
            permissionType: perm.type,
            reason: perm.reason,
            startDate: perm.startDate,
            endDate: perm.endDate,
            duration: perm.duration,
            attachmentUrl: perm.attachment,
            status: perm.status === 'PENDING' ? 'Menunggu' :
                    perm.status === 'APPROVED' ? 'Disetujui' : 'Ditolak',
            approvedBy: perm.approvedBy?.user?.name,
            approvedAt: perm.approvedAt,
            rejectionReason: perm.rejectionReason,
            createdAt: perm.createdAt,
            otherDetails: perm.otherDetails
          }));
          
          setPermissionData(transformedData);
          setFilteredData(transformedData);
          setSampleMode(false);
        } catch (fetchError) {
          console.error("Error dalam fetch:", fetchError);
          // Gunakan data contoh untuk tampilan
          setPermissionData(samplePermissionData);
          setFilteredData(samplePermissionData);
          setSampleMode(true);
          toast.error("Menampilkan data contoh karena terjadi error komunikasi dengan server");
        }
      } catch (error) {
        console.error("Auth error, but staying on page:", error);
        toast.error("Gagal mengambil data izin. Menampilkan data contoh.");
        
        // Set data contoh
        setPermissionData(samplePermissionData);
        setFilteredData(samplePermissionData);
        setSampleMode(true);
      } finally {
        setIsLoading(false);
      }
    };
    
    const fetchEmployees = async () => {
      try {
        // Coba fetch data dari API
        try {
          const response = await fetch(`/api/employees?noRedirect=true`, {
            cache: "no-store",
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
            }
          });
          
          if (!response.ok) {
            console.log("Menggunakan data karyawan contoh karena response tidak OK");
            setEmployees(sampleEmployees);
            return;
          }
          
          const data = await response.json();
          const employeesList = data.map((emp: EmployeeApiResponse) => ({
            id: emp.id,
            name: emp.user.name,
            departmentId: emp.departmentId,
            subDepartmentId: emp.subDepartmentId,
            position: emp.position?.name || '-'
          }));
          
          setEmployees(employeesList);
        } catch (fetchError) {
          console.error("Error dalam fetch karyawan:", fetchError);
          setEmployees(sampleEmployees);
        }
      } catch (error) {
        console.error("Error fetching employees:", error);
        toast.error("Menampilkan data karyawan contoh.");
        setEmployees(sampleEmployees);
      }
    };
    
    const fetchDepartments = async () => {
      try {
        // Coba fetch data dari API
        try {
          const response = await fetch('/api/departments?noRedirect=true', {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            setDepartments(data);
          } else {
            setDepartments(sampleDepartments);
          }
        } catch (fetchError) {
          console.error("Error dalam fetch departemen:", fetchError);
          setDepartments(sampleDepartments);
        }
      } catch (error) {
        console.error("Error fetching departments:", error);
        setDepartments(sampleDepartments);
      }
    };
    
    const fetchSubDepartments = async () => {
      try {
        // Coba fetch data dari API
        try {
          const response = await fetch('/api/sub-departments?noRedirect=true', {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            setSubDepartments(data);
          } else {
            setSubDepartments(sampleSubDepartments);
          }
        } catch (fetchError) {
          console.error("Error dalam fetch sub-departemen:", fetchError);
          setSubDepartments(sampleSubDepartments);
        }
      } catch (error) {
        console.error("Error fetching sub departments:", error);
        setSubDepartments(sampleSubDepartments);
      }
    };
    
    fetchPermissions();
    fetchEmployees();
    fetchDepartments();
    fetchSubDepartments();
    
    // Tambahkan event listener untuk mendeteksi sesi kedaluwarsa
    const handleSessionExpired = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail?.preventRedirect) {
        setSampleMode(true);
        toast.error("Menampilkan data contoh karena sesi telah berakhir");
      }
    };
    
    window.addEventListener('auth:sessionExpired', handleSessionExpired);
    
    return () => {
      window.removeEventListener('auth:sessionExpired', handleSessionExpired);
    };
  }, []);
  
  // Filter data izin
  useEffect(() => {
    const filtered = permissionData.filter(permission => {
      const matchesSearch = 
        permission.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        permission.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = filterStatus === "ALL" || permission.status === filterStatus;
      const matchesType = filterType === "ALL" || permission.permissionType === filterType;
      
      return matchesSearch && matchesStatus && matchesType;
    });
    
    setFilteredData(filtered);
  }, [searchTerm, filterStatus, filterType, permissionData]);
  
  // Reset form
  const resetForm = () => {
    setPermissionType("VACATION");
    setStartDate(format(new Date(), "yyyy-MM-dd"));
    setEndDate(format(new Date(), "yyyy-MM-dd"));
    setReason("");
    setOtherDetails("");
    setAttachment(null);
    setSelectedEmployee("");
  };
  
  // Handler untuk dialog detail izin
  const handleOpenDetail = (permission: Permission) => {
    setSelectedPermission(permission);
    setIsDetailDialogOpen(true);
  };
  
  // Handler untuk dialog persetujuan izin
  const handleOpenApprove = (permission: Permission) => {
    setSelectedPermission(permission);
    setIsApproveDialogOpen(true);
  };
  
  // Handler untuk dialog penolakan izin
  const handleOpenReject = (permission: Permission) => {
    setSelectedPermission(permission);
    setIsRejectDialogOpen(true);
  };
  
  // Handler untuk submit pengajuan izin
  const handleSubmitPermission = async () => {
    if (!selectedEmployee) {
      toast.error("Silakan pilih karyawan terlebih dahulu");
      return;
    }
    
    if (!startDate || !endDate) {
      toast.error("Tanggal mulai dan tanggal akhir harus diisi");
      return;
    }
    
    if (!reason || reason.trim().length < 5) {
      toast.error("Alasan harus diisi minimal 5 karakter");
      return;
    }
    
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    
    if (endDateObj < startDateObj) {
      toast.error("Tanggal akhir tidak boleh sebelum tanggal mulai");
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Jika dalam sample mode, buat pengajuan baru secara lokal
      if (sampleMode) {
        // Hitung durasi hari
        const diffTime = Math.abs(endDateObj.getTime() - startDateObj.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Buat ID baru
        const newId = `IP-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
        
        // Buat data izin baru
        const newPermission: Permission = {
          id: newId,
          employeeId: selectedEmployee,
          employeeName: employees.find(emp => emp.id === selectedEmployee)?.name || "",
          department: departments.find(dept => 
            dept.id === employees.find(emp => emp.id === selectedEmployee)?.departmentId
          )?.name || "",
          position: employees.find(emp => emp.id === selectedEmployee)?.position || "",
          permissionType: permissionType,
          reason: reason,
          startDate: startDate,
          endDate: endDate,
          duration: diffDays || 1,
          status: "Menunggu",
          createdAt: new Date().toISOString(),
          otherDetails: permissionType === "OTHER" ? otherDetails : undefined
        };
        
        // Tambahkan ke data izin
        const updatedPermissions = [newPermission, ...permissionData];
        setPermissionData(updatedPermissions);
        setFilteredData(updatedPermissions);
        
        resetForm();
        setIsSubmitDialogOpen(false);
        toast.success("Pengajuan izin berhasil dibuat (Mode Contoh)");
        return;
      }
      
      // Siapkan data izin untuk dikirim ke API
      const permissionRequestData = {
        employeeId: selectedEmployee,
        type: permissionType,
        startDate: startDate,
        endDate: endDate,
        reason: reason,
        otherDetails: permissionType === "OTHER" ? otherDetails : undefined
      };

      try {
        const response = await fetch("/api/permissions?noRedirect=true", {
          method: "POST",
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
          },
          body: JSON.stringify(permissionRequestData),
        });
        
        if (!response.ok) {
          // Jika terjadi error, gunakan simulasi data
          console.log("Menggunakan simulasi untuk pengajuan izin karena response tidak OK");
          
          // Hitung durasi hari
          const diffTime = Math.abs(endDateObj.getTime() - startDateObj.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          // Buat ID baru
          const newId = `IP-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
          
          // Buat data izin baru
          const newPermission: Permission = {
            id: newId,
            employeeId: selectedEmployee,
            employeeName: employees.find(emp => emp.id === selectedEmployee)?.name || "",
            department: departments.find(dept => 
              dept.id === employees.find(emp => emp.id === selectedEmployee)?.departmentId
            )?.name || "",
            position: employees.find(emp => emp.id === selectedEmployee)?.position || "",
            permissionType: permissionType,
            reason: reason,
            startDate: startDate,
            endDate: endDate,
            duration: diffDays || 1,
            status: "Menunggu",
            createdAt: new Date().toISOString(),
            otherDetails: permissionType === "OTHER" ? otherDetails : undefined
          };
          
          // Tambahkan ke data izin
          const updatedPermissions = [newPermission, ...permissionData];
          setPermissionData(updatedPermissions);
          setFilteredData(updatedPermissions);
          
          resetForm();
          setIsSubmitDialogOpen(false);
          setSampleMode(true);
          toast.success("Pengajuan izin berhasil dibuat (Mode Contoh)");
          return;
        }

        // Gunakan response jika diperlukan
        await response.json();
        
        // Reset form dan tutup dialog
        resetForm();
        setIsSubmitDialogOpen(false);

        // Refresh data izin
        try {
          const fetchResponse = await fetch('/api/permissions?noRedirect=true', {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
            }
          });
          
          if (fetchResponse.ok) {
            const data = await fetchResponse.json();
            const transformedData = data.map((perm: PermissionApiResponse) => ({
              id: perm.id,
              employeeId: perm.employee.id,
              employeeName: perm.employee.user.name,
              department: perm.employee.department?.name || '-',
              position: perm.employee.position?.name || '-',
              permissionType: perm.type,
              reason: perm.reason,
              startDate: perm.startDate,
              endDate: perm.endDate,
              duration: perm.duration,
              attachmentUrl: perm.attachment,
              status: perm.status === 'PENDING' ? 'Menunggu' :
                     perm.status === 'APPROVED' ? 'Disetujui' : 'Ditolak',
              approvedBy: perm.approvedBy?.user?.name,
              approvedAt: perm.approvedAt,
              rejectionReason: perm.rejectionReason,
              createdAt: perm.createdAt,
              otherDetails: perm.otherDetails
            }));
            setPermissionData(transformedData);
            setFilteredData(transformedData);
          } else {
            throw new Error("Gagal refresh data");
          }
        } catch (refreshError) {
          console.error("Error refreshing data:", refreshError);
          // Refresh dengan data yang baru saja ditambahkan secara lokal
          toast.error("Menampilkan perubahan secara lokal");
        }

        toast.success("Pengajuan izin berhasil dikirim");
      } catch (submitError) {
        console.error("Error submitting permission:", submitError);
        toast.error("Gagal mengirim permintaan izin. Mencoba dengan mode contoh.");
        setSampleMode(true);
      }
    } catch (error) {
      console.error("Error submitting permission:", error);
      toast.error("Gagal mengirim permintaan izin. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handler untuk menyetujui izin
  const handleApprovePermission = async () => {
    try {
      setIsSubmitting(true);
      
      // Jika dalam sample mode, update data secara lokal
      if (sampleMode || !selectedPermission) {
        // Update data di state
        const updatedData = permissionData.map(perm => {
          if (perm.id === selectedPermission?.id) {
            return {
              ...perm,
              status: 'Disetujui',
              approvedBy: 'Admin',
              approvedAt: new Date().toISOString()
            };
          }
          return perm;
        });
        
        setPermissionData(updatedData);
        setFilteredData(updatedData);
        setIsApproveDialogOpen(false);
        toast.success('Izin berhasil disetujui (Mode Contoh)');
        return;
      }
      
      try {
        const response = await fetch(`/api/permissions/${selectedPermission?.id}/approve?noRedirect=true`, {
          method: "PUT",
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
          }
        });

        if (!response.ok) {
          // Update data secara lokal jika terjadi error
          const updatedData = permissionData.map(perm => {
            if (perm.id === selectedPermission?.id) {
              return {
                ...perm,
                status: 'Disetujui',
                approvedBy: 'Admin',
                approvedAt: new Date().toISOString()
              };
            }
            return perm;
          });
          
          setPermissionData(updatedData);
          setFilteredData(updatedData);
          setIsApproveDialogOpen(false);
          setSampleMode(true);
          toast.success('Izin berhasil disetujui (Mode Contoh)');
          return;
        }

        const result = await response.json();
        
        // Update data di state
        const updatedData = permissionData.map(perm => {
          if (perm.id === selectedPermission?.id) {
            return {
              ...perm,
              status: 'Disetujui',
              approvedBy: result.data.approvedBy?.user?.name || 'Admin',
              approvedAt: result.data.approvedAt || new Date().toISOString()
            };
          }
          return perm;
        });
        
        setPermissionData(updatedData);
        setFilteredData(updatedData);
        setIsApproveDialogOpen(false);
        toast.success('Izin berhasil disetujui');
      } catch (approveError) {
        console.error("Error dalam approve:", approveError);
        // Update data secara lokal jika terjadi error
        const updatedData = permissionData.map(perm => {
          if (perm.id === selectedPermission?.id) {
            return {
              ...perm,
              status: 'Disetujui',
              approvedBy: 'Admin',
              approvedAt: new Date().toISOString()
            };
          }
          return perm;
        });
        
        setPermissionData(updatedData);
        setFilteredData(updatedData);
        setIsApproveDialogOpen(false);
        setSampleMode(true);
        toast.success('Izin berhasil disetujui (Mode Contoh)');
      }
    } catch (error) {
      console.error("Error approving permission:", error);
      toast.error("Gagal menyetujui izin. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handler untuk menolak izin
  const handleRejectPermission = async () => {
    try {
      if (!rejectionReason || rejectionReason.trim().length < 3) {
        toast.error('Alasan penolakan minimal 3 karakter');
        return;
      }
      
      setIsSubmitting(true);
      
      // Jika dalam sample mode, update data secara lokal
      if (sampleMode || !selectedPermission) {
        // Update data di state
        const updatedData = permissionData.map(perm => {
          if (perm.id === selectedPermission?.id) {
            return {
              ...perm,
              status: 'Ditolak',
              rejectionReason: rejectionReason
            };
          }
          return perm;
        });
        
        setPermissionData(updatedData);
        setFilteredData(updatedData);
        setIsRejectDialogOpen(false);
        setRejectionReason('');
        toast.success('Izin berhasil ditolak (Mode Contoh)');
        return;
      }
      
      try {
        const response = await fetch(`/api/permissions/${selectedPermission?.id}/reject?noRedirect=true`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
          },
          body: JSON.stringify({
            rejectionReason: rejectionReason
          })
        });

        if (!response.ok) {
          // Update data secara lokal jika terjadi error
          const updatedData = permissionData.map(perm => {
            if (perm.id === selectedPermission?.id) {
              return {
                ...perm,
                status: 'Ditolak',
                rejectionReason: rejectionReason
              };
            }
            return perm;
          });
          
          setPermissionData(updatedData);
          setFilteredData(updatedData);
          setIsRejectDialogOpen(false);
          setRejectionReason('');
          setSampleMode(true);
          toast.success('Izin berhasil ditolak (Mode Contoh)');
          return;
        }
        
        // Gunakan result jika diperlukan di masa depan
        await response.json();
        
        // Update data di state
        const updatedData = permissionData.map(perm => {
          if (perm.id === selectedPermission?.id) {
            return {
              ...perm,
              status: 'Ditolak',
              rejectionReason: rejectionReason
            };
          }
          return perm;
        });
        
        setPermissionData(updatedData);
        setFilteredData(updatedData);
        setIsRejectDialogOpen(false);
        setRejectionReason('');
        toast.success('Izin berhasil ditolak');
      } catch (rejectError) {
        console.error("Error dalam reject:", rejectError);
        // Update data secara lokal jika terjadi error
        const updatedData = permissionData.map(perm => {
          if (perm.id === selectedPermission?.id) {
            return {
              ...perm,
              status: 'Ditolak',
              rejectionReason: rejectionReason
            };
          }
          return perm;
        });
        
        setPermissionData(updatedData);
        setFilteredData(updatedData);
        setIsRejectDialogOpen(false);
        setRejectionReason('');
        setSampleMode(true);
        toast.success('Izin berhasil ditolak (Mode Contoh)');
      }
    } catch (error) {
      console.error("Error rejecting permission:", error);
      toast.error(`Gagal menolak izin: ${error instanceof Error ? error.message : 'Terjadi kesalahan'}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handler untuk ekspor data
  const handleExportData = () => {
    console.log("Mengekspor data izin:", filteredData);
    alert("Fungsi ekspor data akan diimplementasikan di sini");
    // TODO: Implementasi ekspor data ke Excel/CSV
  };
  
  // Handler untuk upload attachment
  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAttachment(e.target.files[0]);
    }
  };
  
  // Fungsi untuk mendapatkan departemen dari karyawan yang dipilih
  const getSelectedEmployeeDepartment = () => {
    const employee = employees.find(emp => emp.id === selectedEmployee);
    if (!employee) return null;
    
    return departments.find(dept => dept.id === employee.departmentId);
  };
  
  // Fungsi untuk mendapatkan sub-departemen dari karyawan yang dipilih
  const getSelectedEmployeeSubDepartment = () => {
    const employee = employees.find(emp => emp.id === selectedEmployee);
    if (!employee || !employee.subDepartmentId) return null;
    
    return subDepartments.find(subDept => subDept.id === employee.subDepartmentId);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Manajemen Izin</h1>
        <Button onClick={() => setIsSubmitDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Ajukan Izin
        </Button>
      </div>
      
      <Tabs defaultValue="list" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="list">Daftar Izin</TabsTrigger>
          <TabsTrigger value="approval">Persetujuan Izin</TabsTrigger>
        </TabsList>
        
        <TabsContent value="list" className="mt-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle>Daftar Semua Izin</CardTitle>
              <CardDescription>
                Lihat dan kelola semua izin yang telah diajukan
              </CardDescription>
              
              <div className="flex flex-col sm:flex-row gap-3 mt-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari berdasarkan nama atau ID karyawan"
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <div className="flex gap-3">
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-36">
                      <div className="flex items-center">
                        <Filter className="mr-2 h-4 w-4" />
                        <span>Status</span>
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Semua Status</SelectItem>
                      <SelectItem value="Menunggu">Menunggu</SelectItem>
                      <SelectItem value="Disetujui">Disetujui</SelectItem>
                      <SelectItem value="Ditolak">Ditolak</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-36">
                      <div className="flex items-center">
                        <Filter className="mr-2 h-4 w-4" />
                        <span>Jenis</span>
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Semua Jenis</SelectItem>
                      <SelectItem value="SICK">Sakit</SelectItem>
                      <SelectItem value="VACATION">Cuti</SelectItem>
                      <SelectItem value="PERSONAL">Keperluan Pribadi</SelectItem>
                      <SelectItem value="OTHER">Lainnya</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button variant="outline" onClick={handleExportData}>
                    <FileDown className="mr-2 h-4 w-4" />
                    Ekspor
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID/Nama</TableHead>
                      <TableHead>Departemen</TableHead>
                      <TableHead>Jenis Izin</TableHead>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Durasi</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center h-24">
                          <div className="flex justify-center items-center space-x-2">
                            <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full"></div>
                            <span>Memuat data...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredData.length > 0 ? (
                      filteredData.map((permission) => (
                        <TableRow key={permission.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{permission.id}</div>
                              <div className="text-sm text-muted-foreground">
                                {permission.employeeName}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{permission.department}</TableCell>
                          <TableCell>{permission.permissionType}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>{formatDate(permission.startDate)}</div>
                              {permission.startDate !== permission.endDate && (
                                <div>hingga {formatDate(permission.endDate)}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{permission.duration} hari</TableCell>
                          <TableCell>
                            <Badge variant={
                              permission.status === "Disetujui" ? "default" : 
                              permission.status === "Ditolak" ? "destructive" : "secondary"
                            }>
                              {permission.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenDetail(permission)}
                            >
                              Detail
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center h-24">
                          Tidak ada data izin yang ditemukan
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="approval" className="mt-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle>Persetujuan Izin</CardTitle>
              <CardDescription>
                Izin yang menunggu persetujuan
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID/Nama</TableHead>
                      <TableHead>Departemen</TableHead>
                      <TableHead>Jenis Izin</TableHead>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Durasi</TableHead>
                      <TableHead>Diajukan Pada</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center h-24">
                          <div className="flex justify-center items-center space-x-2">
                            <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full"></div>
                            <span>Memuat data...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredData.filter(p => p.status === "Menunggu").length > 0 ? (
                        filteredData
                          .filter(p => p.status === "Menunggu")
                          .map((permission) => (
                          <TableRow key={permission.id}>
                            <TableCell>{permission.id}</TableCell>
                            <TableCell>{permission.department}</TableCell>
                            <TableCell>{permission.permissionType}</TableCell>
                            <TableCell>
                              {formatDate(permission.startDate)}
                              {permission.duration > 1 && ` - ${formatDate(permission.endDate)}`}
                            </TableCell>
                            <TableCell>{permission.duration} hari</TableCell>
                            <TableCell>{formatDateTime(permission.createdAt)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenDetail(permission)}
                                >
                                  Detail
                                </Button>
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => handleOpenApprove(permission)}
                                >
                                  Setujui
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleOpenReject(permission)}
                                >
                                  Tolak
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center h-24">
                          Tidak ada izin yang menunggu persetujuan
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Dialog untuk pengajuan izin */}
      <Dialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Ajukan Izin</DialogTitle>
            <DialogDescription>
              Isi detail informasi izin yang akan diajukan
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div>
              <label htmlFor="employee" className="text-sm font-medium mb-2 block">
                Karyawan
              </label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih karyawan" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedEmployee && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium mb-2">Departemen</p>
                  <p className="text-sm border rounded-md p-2">
                    {getSelectedEmployeeDepartment()?.name || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Sub Departemen</p>
                  <p className="text-sm border rounded-md p-2">
                    {getSelectedEmployeeSubDepartment()?.name || '-'}
                  </p>
                </div>
              </div>
            )}
            
            <div>
              <label htmlFor="permissionType" className="text-sm font-medium mb-2 block">
                Jenis Izin
              </label>
              <Select value={permissionType} onValueChange={setPermissionType}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih jenis izin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SICK">Sakit</SelectItem>
                  <SelectItem value="VACATION">Cuti</SelectItem>
                  <SelectItem value="PERSONAL">Keperluan Pribadi</SelectItem>
                  <SelectItem value="OTHER">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {permissionType === "OTHER" && (
              <div>
                <label htmlFor="otherDetails" className="text-sm font-medium mb-2 block">
                  Detail Jenis Izin Lainnya
                </label>
                <Input
                  id="otherDetails"
                  placeholder="Sebutkan jenis izin lainnya"
                  value={otherDetails}
                  onChange={(e) => setOtherDetails(e.target.value)}
                />
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="startDate" className="text-sm font-medium mb-2 block">
                  Tanggal Mulai
                </label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min={format(new Date(), "yyyy-MM-dd")}
                />
              </div>
              <div>
                <label htmlFor="endDate" className="text-sm font-medium mb-2 block">
                  Tanggal Akhir
                </label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="reason" className="text-sm font-medium mb-2 block">
                Alasan
              </label>
              <Textarea
                id="reason"
                placeholder="Alasan pengajuan izin"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
            
            <div>
              <label htmlFor="attachment" className="text-sm font-medium mb-2 block">
                Lampiran {permissionType === "SICK" && "(Wajib untuk izin sakit)"}
              </label>
              <div className="flex items-center gap-2">
                <Input
                  id="attachment"
                  type="file"
                  onChange={handleAttachmentChange}
                />
              </div>
              {attachment && (
                <p className="text-sm text-muted-foreground mt-1">
                  File terpilih: {attachment.name}
                </p>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              resetForm();
              setIsSubmitDialogOpen(false);
            }}>
              Batal
            </Button>
            <Button onClick={handleSubmitPermission} disabled={isSubmitting}>
              {isSubmitting ? "Memproses..." : "Ajukan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog untuk detail izin */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Detail Izin</DialogTitle>
            <DialogDescription>
              {selectedPermission && `${selectedPermission.id} - ${selectedPermission.employeeName}`}
            </DialogDescription>
          </DialogHeader>
          
          {selectedPermission && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Tipe Izin</p>
                  <p className="font-medium">
                    {selectedPermission.permissionType === "OTHER" 
                      ? `Lainnya - ${selectedPermission.otherDetails}` 
                      : selectedPermission.permissionType === "SICK" 
                        ? "Sakit"
                        : selectedPermission.permissionType === "VACATION"
                          ? "Cuti"
                          : "Keperluan Pribadi"
                    }
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={
                    selectedPermission.status === "Disetujui" ? "default" : 
                    selectedPermission.status === "Ditolak" ? "destructive" : "secondary"
                  }>
                    {selectedPermission.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tanggal Mulai</p>
                  <p className="font-medium">{formatDate(selectedPermission.startDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tanggal Akhir</p>
                  <p className="font-medium">{formatDate(selectedPermission.endDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Durasi</p>
                  <p className="font-medium">{selectedPermission.duration} hari</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tanggal Pengajuan</p>
                  <p className="font-medium">{formatDateTime(selectedPermission.createdAt)}</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Alasan</p>
                <p className="p-3 bg-muted rounded-md mt-1">{selectedPermission.reason}</p>
              </div>
              
              {selectedPermission.attachmentUrl && (
                <div>
                  <p className="text-sm text-muted-foreground">Lampiran</p>
                  <a 
                    href={selectedPermission.attachmentUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Lihat lampiran
                  </a>
                </div>
              )}
              
              {selectedPermission.status === "Disetujui" && selectedPermission.approvedBy && (
                <div>
                  <p className="text-sm text-muted-foreground">Disetujui Oleh</p>
                  <div className="flex justify-between">
                    <p>{selectedPermission.approvedBy}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedPermission.approvedAt && formatDateTime(selectedPermission.approvedAt)}
                    </p>
                  </div>
                </div>
              )}
              
              {selectedPermission.status === "Ditolak" && selectedPermission.rejectedReason && (
                <div>
                  <p className="text-sm text-muted-foreground">Alasan Penolakan</p>
                  <p className="p-3 bg-destructive/10 text-destructive rounded-md mt-1">
                    {selectedPermission.rejectedReason}
                  </p>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
              Tutup
            </Button>
            {selectedPermission && selectedPermission.status === "Menunggu" && (
              <div className="flex gap-2">
                <Button variant="destructive" className="px-4 py-2" onClick={() => {
                  setIsDetailDialogOpen(false);
                  handleOpenReject(selectedPermission);
                }}>
                  Tolak
                </Button>
                <Button onClick={() => {
                  setIsDetailDialogOpen(false);
                  handleOpenApprove(selectedPermission);
                }}>
                  Setujui
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog untuk persetujuan izin */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Setujui Izin</DialogTitle>
            <DialogDescription>
              {selectedPermission && `Konfirmasi persetujuan izin untuk ${selectedPermission.employeeName}`}
            </DialogDescription>
          </DialogHeader>
          
          {selectedPermission && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Tipe Izin</p>
                  <p className="font-medium">{selectedPermission.permissionType}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Durasi</p>
                  <p className="font-medium">{selectedPermission.duration} hari</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tanggal Mulai</p>
                  <p className="font-medium">{formatDate(selectedPermission.startDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tanggal Akhir</p>
                  <p className="font-medium">{formatDate(selectedPermission.endDate)}</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Alasan</p>
                <p className="p-3 bg-muted rounded-md mt-1">{selectedPermission.reason}</p>
              </div>
              
              <div className="bg-green-50 p-4 rounded-md border border-green-100">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <p className="font-medium text-green-700">Konfirmasi Persetujuan</p>
                </div>
                <p className="text-sm text-green-600 mt-1">
                  Anda akan menyetujui izin ini. Karyawan akan menerima notifikasi setelah izin disetujui.
                </p>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleApprovePermission} disabled={isSubmitting}>
              {isSubmitting ? "Memproses..." : "Setuju"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog untuk penolakan izin */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Tolak Izin</DialogTitle>
            <DialogDescription>
              {selectedPermission && `Konfirmasi penolakan izin untuk ${selectedPermission.employeeName}`}
            </DialogDescription>
          </DialogHeader>
          
          {selectedPermission && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Tipe Izin</p>
                  <p className="font-medium">{selectedPermission.permissionType}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Durasi</p>
                  <p className="font-medium">{selectedPermission.duration} hari</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tanggal Mulai</p>
                  <p className="font-medium">{formatDate(selectedPermission.startDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tanggal Akhir</p>
                  <p className="font-medium">{formatDate(selectedPermission.endDate)}</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Alasan</p>
                <p className="p-3 bg-muted rounded-md mt-1">{selectedPermission.reason}</p>
              </div>
              
              <div>
                <label htmlFor="rejectionReason" className="text-sm font-medium mb-2 block">
                  Alasan Penolakan
                </label>
                <Textarea
                  id="rejectionReason"
                  placeholder="Masukkan alasan penolakan izin"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="min-h-[100px]"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Berikan alasan yang jelas mengapa izin ini ditolak.
                </p>
              </div>
              
              <div className="bg-red-50 p-4 rounded-md border border-red-100">
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-500" />
                  <p className="font-medium text-red-700">Konfirmasi Penolakan</p>
                </div>
                <p className="text-sm text-red-600 mt-1">
                  Anda akan menolak izin ini. Karyawan akan menerima notifikasi tentang penolakan beserta alasannya.
                </p>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleRejectPermission} disabled={isSubmitting}>
              {isSubmitting ? "Memproses..." : "Tolak Izin"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Tambahkan banner peringatan jika dalam mode sample */}
      {sampleMode && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                <strong>Mode Data Contoh:</strong> Halaman ini menampilkan data contoh karena koneksi ke server tidak tersedia. Anda masih dapat melihat, menambah, menyetujui, dan menolak izin, namun perubahan hanya disimpan secara lokal.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Halaman utama yang dibungkus dengan PermissionPageGuard
export default function PermissionPage() {
  return (
    <PermissionPageGuard>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold tracking-tight">Kelola Izin & Cuti</h1>
        </div>
        <div className="border rounded-lg bg-white">
          <PermissionPageContent />
        </div>
      </div>
    </PermissionPageGuard>
  );
} 