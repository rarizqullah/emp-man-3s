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
  
  // Tambahkan state untuk menandai loading dan error
  const [error, setError] = useState<string | null>(null);
  
  // Mengambil data izin, karyawan, departemen, dan sub-departemen
  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        console.log("Fetching permissions...");
        
        const response = await fetch(`/api/permissions?noRedirect=true`, {
          cache: "no-store",
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
          }
        });
        
        console.log("Permission response status:", response.status);
        
        if (!response.ok) {
          if (response.status === 401) {
            setError("Sesi Anda telah berakhir. Silakan login kembali.");
          } else {
            setError(`Error ${response.status}: Gagal mengambil data izin`);
          }
          setPermissionData([]);
          setFilteredData([]);
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
      } catch (fetchError) {
        console.error("Error dalam fetch:", fetchError);
        setError("Gagal terhubung ke server. Periksa koneksi internet Anda.");
        setPermissionData([]);
        setFilteredData([]);
        toast.error("Gagal mengambil data izin");
      } finally {
        setIsLoading(false);
      }
    };
    
    const fetchEmployees = async () => {
      try {
        const response = await fetch(`/api/employees?noRedirect=true`, {
          cache: "no-store",
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          const employeesList = data.map((emp: EmployeeApiResponse) => ({
            id: emp.id,
            name: emp.user.name,
            departmentId: emp.departmentId,
            subDepartmentId: emp.subDepartmentId,
            position: emp.position?.name || '-'
          }));
          
          setEmployees(employeesList);
        } else {
          console.error("Failed to fetch employees");
          setEmployees([]);
        }
      } catch (error) {
        console.error("Error fetching employees:", error);
        setEmployees([]);
      }
    };
    
    const fetchDepartments = async () => {
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
          console.error("Failed to fetch departments");
          setDepartments([]);
        }
      } catch (error) {
        console.error("Error fetching departments:", error);
        setDepartments([]);
      }
    };
    
    const fetchSubDepartments = async () => {
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
          console.error("Failed to fetch sub departments");
          setSubDepartments([]);
        }
      } catch (error) {
        console.error("Error fetching sub departments:", error);
        setSubDepartments([]);
      }
    };
    
    fetchPermissions();
    fetchEmployees();
    fetchDepartments();
    fetchSubDepartments();
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
        
      // Siapkan data izin untuk dikirim ke API
      const permissionRequestData = {
        employeeId: selectedEmployee,
        type: permissionType,
        startDate: startDate,
        endDate: endDate,
        reason: reason,
        otherDetails: permissionType === "OTHER" ? otherDetails : undefined
      };

      const response = await fetch("/api/permissions?noRedirect=true", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify(permissionRequestData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Gagal membuat izin');
      }

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
        }
      } catch (refreshError) {
        console.error("Error refreshing data:", refreshError);
        toast.error("Izin berhasil dibuat, silakan refresh halaman untuk melihat perubahan");
      }

      toast.success("Pengajuan izin berhasil dikirim");
    } catch (error) {
      console.error("Error submitting permission:", error);
      toast.error("Gagal mengirim permintaan izin. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handler untuk menyetujui izin
  const handleApprovePermission = async () => {
    if (!selectedPermission) {
      toast.error("Tidak ada izin yang dipilih");
      return;
    }

    try {
      setIsSubmitting(true);
      
      const response = await fetch(`/api/permissions/${selectedPermission.id}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Gagal menyetujui izin');
      }

      // Update data di state
      const updatedData = permissionData.map(perm => {
        if (perm.id === selectedPermission.id) {
          return {
            ...perm,
            status: "Disetujui",
            approvedBy: "Admin", // Sesuaikan dengan user yang login
            approvedAt: new Date().toISOString()
          };
        }
        return perm;
      });

      setPermissionData(updatedData);
      setFilteredData(updatedData);
      setIsApproveDialogOpen(false);
      setSelectedPermission(null);
      
      toast.success("Izin berhasil disetujui");
    } catch (error) {
      console.error("Error approving permission:", error);
      toast.error("Gagal menyetujui izin. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handler untuk menolak izin
  const handleRejectPermission = async () => {
    if (!selectedPermission) {
      toast.error("Tidak ada izin yang dipilih");
      return;
    }

    if (!rejectionReason || rejectionReason.trim().length < 5) {
      toast.error("Alasan penolakan harus diisi minimal 5 karakter");
      return;
    }

    try {
      setIsSubmitting(true);
      
      const response = await fetch(`/api/permissions/${selectedPermission.id}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({
          rejectionReason: rejectionReason
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Gagal menolak izin');
      }

      // Update data di state
      const updatedData = permissionData.map(perm => {
        if (perm.id === selectedPermission.id) {
          return {
            ...perm,
            status: "Ditolak",
            rejectedReason: rejectionReason
          };
        }
        return perm;
      });

      setPermissionData(updatedData);
      setFilteredData(updatedData);
      setIsRejectDialogOpen(false);
      setSelectedPermission(null);
      setRejectionReason("");
      
      toast.success("Izin berhasil ditolak");
    } catch (error) {
      console.error("Error rejecting permission:", error);
      toast.error("Gagal menolak izin. Silakan coba lagi.");
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
              {/* Loading State */}
              {isLoading && (
                <div className="flex justify-center items-center py-8">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full"></div>
                    <span className="text-muted-foreground">Memuat data izin...</span>
                  </div>
                </div>
              )}

              {/* Error State */}
              {error && !isLoading && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700">
                        <strong>Error:</strong> {error}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Empty State */}
              {!isLoading && !error && filteredData.length === 0 && (
                <div className="text-center py-8">
                  <div className="text-muted-foreground">
                    {permissionData.length === 0 
                      ? "Belum ada data izin. Buat izin pertama dengan klik tombol 'Ajukan Izin'."
                      : "Tidak ada data yang sesuai dengan filter pencarian."
                    }
                  </div>
                </div>
              )}

              {/* Data Table */}
              {!isLoading && !error && filteredData.length > 0 && (
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
                      {filteredData.map((permission) => (
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
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
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