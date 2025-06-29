"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Search,
  FileDown,
  UserPlus,
  Filter,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Users,
  AlertTriangle
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import * as XLSX from 'xlsx';

// Import modals
import { AddEmployeeModal } from "@/components/employee/AddEmployeeModal";
import { WarningStatusModal } from "@/components/employee/WarningStatusModal";
import { ShiftChangeModal } from "@/components/employee/ShiftChangeModal";
import { DeleteEmployeeModal } from "@/components/employee/DeleteEmployeeModal";
import { BulkShiftChangeModal } from "@/components/employee/BulkShiftChangeModal";
import { EmployeeHistoryModal } from "@/components/employee/EmployeeHistoryModal";

// Type untuk form perubahan status SP
interface WarningStatusFormValues {
  warningStatus: "NONE" | "SP1" | "SP2" | "SP3";
  startDate: Date;
  endDate?: Date | null;
  reason: string;
}

// Type untuk form perubahan shift
interface ShiftChangeFormValues {
  shift: string;
  effectiveDate: Date;
  notes?: string;
}

// Tipe data untuk karyawan dari API
interface Employee {
  id: string;
  employeeId: string;
  departmentId: string;
  subDepartmentId?: string;
  positionId?: string;
  shiftId: string;
  contractType: string;
  contractNumber?: string;
  contractStartDate: string;
  contractEndDate?: string;
  warningStatus: string;
  gender: string;
  address?: string;
  faceData?: string;
  createdAt: string;
  updatedAt: string;
  user: {
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
  };
  position?: {
    id: string;
    name: string;
    level: number;
  };
  shift: {
    id: string;
    name: string;
    shiftType: string;
  };
}

interface Department {
  id: string;
  name: string;
}

interface Position {
  id: string;
  name: string;
  level: number;
}

export default function EmployeePage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("ALL");
  const [filterContractType, setFilterContractType] = useState("ALL");
  
  // State untuk mengelola modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [warningModalOpen, setWarningModalOpen] = useState(false);
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [bulkShiftModalOpen, setBulkShiftModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  
  // State untuk data dari API
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [expiringContracts, setExpiringContracts] = useState<Employee[]>([]);
  
  // State untuk menyimpan data karyawan yang sedang diedit
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  
  // State untuk multiple selection
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  
  // State untuk pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  
  // Fetch data karyawan dari API dengan retry logic
  const fetchEmployees = async (retryCount = 0) => {
    const maxRetries = 3;
    
    try {
      setLoading(true);
      
      // Jika ini adalah retry kedua atau lebih, coba bersihkan koneksi database terlebih dahulu
      if (retryCount >= 1) {
        console.log(`Mencoba retry ke-${retryCount}, membersihkan koneksi database...`);
        
        try {
          const cleanResponse = await fetch('/api/employees/clean-connection', {
            method: 'POST',
          });
          
          if (cleanResponse.ok) {
            const cleanResult = await cleanResponse.json();
            console.log('Koneksi database berhasil dibersihkan:', cleanResult);
            
            // Tunggu sebentar setelah pembersihan
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        } catch {
          console.log('Gagal membersihkan koneksi, lanjut dengan request normal');
        }
      }
      
      const response = await fetch('/api/employees', {
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Jika error adalah koneksi database dan masih ada retry, coba lagi
        if (
          errorData.code === 'DB_CONNECTION_ERROR' &&
          retryCount < maxRetries
        ) {
          console.log(`Database connection error, retry ${retryCount + 1}/${maxRetries}`);
          await new Promise(resolve => setTimeout(resolve, 3000 * (retryCount + 1)));
          return fetchEmployees(retryCount + 1);
        }
        
        throw new Error(errorData.error || 'Gagal mengambil data karyawan');
      }
      
      const data = await response.json();
      setEmployees(data);
      
      // Reset retry count on success
      if (retryCount > 0) {
        toast.success('Berhasil memuat data karyawan setelah retry');
      }
      
    } catch (error) {
      console.error('Error fetching employees:', error);
      
      // Jika masih ada retry dan ini bukan error parsing, coba lagi
      if (retryCount < maxRetries && !String(error).includes('Unexpected token')) {
        console.log(`Retry ${retryCount + 1}/${maxRetries} after error:`, error);
        toast.warning(`Gagal memuat data, mencoba lagi... (${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 3000 * (retryCount + 1)));
        return fetchEmployees(retryCount + 1);
      }
      
      // Jika semua retry gagal, tampilkan error dan gunakan fallback
      toast.error(`Gagal mengambil data karyawan setelah ${maxRetries} percobaan. Menampilkan data fallback.`);
      
      // Gunakan data dummy jika API gagal setelah semua retry
      setEmployees([
        {
          id: "1",
          employeeId: "EMP001",
          departmentId: "1",
          subDepartmentId: "1",
          shiftId: "1",
          contractType: "PERMANENT",
          contractStartDate: "2023-01-01T00:00:00.000Z",
          warningStatus: "NONE",
          gender: "MALE",
          createdAt: "2023-01-01T00:00:00.000Z",
          updatedAt: "2023-01-01T00:00:00.000Z",
          user: {
            name: "Data Fallback - Budi Santoso",
            email: "budi@example.com",
            role: "EMPLOYEE"
          },
          department: {
            id: "1",
            name: "IT"
          },
          subDepartment: {
            id: "1",
            name: "Software Development"
          },
          position: {
            id: "1",
            name: "Software Engineer",
            level: 1
          },
          shift: {
            id: "1",
            name: "Non-Shift",
            shiftType: "NON_SHIFT"
          }
        },
        {
          id: "2",
          employeeId: "EMP002",
          departmentId: "2",
          shiftId: "1",
          contractType: "PERMANENT",
          contractStartDate: "2023-01-01T00:00:00.000Z",
          warningStatus: "NONE",
          gender: "FEMALE",
          createdAt: "2023-01-01T00:00:00.000Z",
          updatedAt: "2023-01-01T00:00:00.000Z",
          user: {
            name: "Data Fallback - Siti Nurhaliza",
            email: "siti@example.com",
            role: "EMPLOYEE"
          },
          department: {
            id: "2",
            name: "HR"
          },
          shift: {
            id: "1",
            name: "Non-Shift",
            shiftType: "NON_SHIFT"
          }
        }
      ]);
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch data departemen dari API
  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/departments');
      if (!response.ok) {
        throw new Error('Gagal mengambil data departemen');
      }
      const data = await response.json();
      setDepartments(data);
    } catch (error) {
      console.error('Error fetching departments:', error);
      
      // Gunakan data dummy jika API gagal
      setDepartments([
        { id: "1", name: "IT" },
        { id: "2", name: "HR" },
        { id: "3", name: "Finance" },
        { id: "4", name: "Marketing" },
        { id: "5", name: "Production" }
      ]);
    }
  };
  
  // Fetch data posisi dari API
  const fetchPositions = async () => {
    try {
      const response = await fetch('/api/positions');
      if (!response.ok) {
        throw new Error('Gagal mengambil data posisi');
      }
      const data = await response.json();
      setPositions(data);
    } catch (error) {
      console.error('Error fetching positions:', error);
    }
  };

  // Check for expiring contracts
  const checkExpiringContracts = (employeeData: Employee[]) => {
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);
    
    const expiring = employeeData.filter(emp => {
      if (!emp.contractEndDate) return false;
      const endDate = new Date(emp.contractEndDate);
      return endDate <= thirtyDaysFromNow && endDate >= today;
    });
    
    setExpiringContracts(expiring);
    
    if (expiring.length > 0) {
      toast.warning(`${expiring.length} kontrak karyawan akan berakhir dalam 30 hari`, {
        duration: 8000,
        action: {
          label: "Lihat Detail",
          onClick: () => setHistoryModalOpen(true)
        }
      });
    }
  };

  // Export to Excel function
  const handleExportExcel = () => {
    try {
      // Prepare data for export
      const exportData = filteredEmployees.map((emp, index) => ({
        'No': index + 1,
        'NIK': emp.employeeId,
        'Nama Lengkap': emp.user.name,
        'Email': emp.user.email,
        'Jenis Kelamin': emp.gender === 'MALE' ? 'Laki-laki' : 'Perempuan',
        'Alamat': emp.address || '-',
        'Departemen': emp.department.name,
        'Sub Departemen': emp.subDepartment?.name || '-',
        'Posisi': emp.position?.name || '-',
        'Level Posisi': emp.position?.level || '-',
        'Shift': emp.shift.name,
        'Tipe Shift': emp.shift.shiftType,
        'Tipe Kontrak': emp.contractType === 'PERMANENT' ? 'Permanen' : 'Training',
        'Nomor Kontrak': emp.contractNumber || '-',
        'Tanggal Mulai Kontrak': new Date(emp.contractStartDate).toLocaleDateString('id-ID'),
        'Tanggal Berakhir Kontrak': emp.contractEndDate ? new Date(emp.contractEndDate).toLocaleDateString('id-ID') : 'Permanen',
        'Status SP': emp.warningStatus === 'NONE' ? 'Tidak Ada SP' : emp.warningStatus,
        'Tanggal Dibuat': new Date(emp.createdAt).toLocaleDateString('id-ID'),
        'Terakhir Diupdate': new Date(emp.updatedAt).toLocaleDateString('id-ID')
      }));

      // Create workbook and worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      
      // Set column widths
      const colWidths = [
        { wch: 5 },  // No
        { wch: 15 }, // NIK
        { wch: 25 }, // Nama
        { wch: 30 }, // Email
        { wch: 12 }, // Gender
        { wch: 30 }, // Alamat
        { wch: 20 }, // Departemen
        { wch: 20 }, // Sub Departemen
        { wch: 20 }, // Posisi
        { wch: 12 }, // Level
        { wch: 15 }, // Shift
        { wch: 15 }, // Tipe Shift
        { wch: 15 }, // Tipe Kontrak
        { wch: 20 }, // Nomor Kontrak
        { wch: 20 }, // Mulai Kontrak
        { wch: 20 }, // Berakhir Kontrak
        { wch: 15 }, // Status SP
        { wch: 15 }, // Dibuat
        { wch: 15 }  // Update
      ];
      ws['!cols'] = colWidths;
      
      XLSX.utils.book_append_sheet(wb, ws, 'Data Karyawan');
      
      // Generate filename with current date
      const fileName = `Data_Karyawan_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      // Save file
      XLSX.writeFile(wb, fileName);
      
      toast.success(`Data berhasil diekspor ke ${fileName}`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Gagal mengekspor data ke Excel');
    }
  };

  // Handle multiple selection
  const handleSelectEmployee = (employeeId: string, checked: boolean) => {
    if (checked) {
      setSelectedEmployees(prev => [...prev, employeeId]);
    } else {
      setSelectedEmployees(prev => prev.filter(id => id !== employeeId));
      setSelectAll(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedEmployees(paginatedEmployees.map(emp => emp.id));
    } else {
      setSelectedEmployees([]);
    }
  };

  const handleBulkShiftChange = () => {
    if (selectedEmployees.length === 0) {
      toast.error('Pilih minimal satu karyawan untuk mengubah shift');
      return;
    }
    setBulkShiftModalOpen(true);
  };
  
  // Memuat data saat komponen dimount
  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
    fetchPositions();
  }, []);
  
  // Filter karyawan berdasarkan pencarian dan filter
  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = 
      employee.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = filterDepartment === "ALL" || employee.department.id === filterDepartment;
    const matchesContractType = filterContractType === "ALL" || employee.contractType === filterContractType;
    
    return matchesSearch && matchesDepartment && matchesContractType;
  });

  // Pagination logic
  const totalItems = filteredEmployees.length;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedEmployees = filteredEmployees.slice(startIndex, endIndex);

  // Update total pages when filtered employees change
  useEffect(() => {
    const newTotalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
    setTotalPages(newTotalPages);
    
    // Reset to first page if current page is beyond total pages
    if (currentPage > newTotalPages && newTotalPages > 0) {
      setCurrentPage(1);
    }
  }, [filteredEmployees.length, itemsPerPage, currentPage]);

  // Update checkExpiringContracts call in fetchEmployees
  useEffect(() => {
    if (employees.length > 0) {
      checkExpiringContracts(employees);
    }
  }, [employees]);
  
  // Handler untuk membuka modal ubah status SP
  const handleOpenWarningModal = (employee: Employee) => {
    console.log('Opening warning modal for employee:', employee.user.name);
    setSelectedEmployee(employee);
    setWarningModalOpen(true);
  };
  
  // Handler untuk membuka modal ubah shift
  const handleOpenShiftModal = (employee: Employee) => {
    console.log('Opening shift modal for employee:', employee.user.name);
    setSelectedEmployee(employee);
    setShiftModalOpen(true);
  };
  
  // Handler untuk membuka modal hapus karyawan
  const handleOpenDeleteModal = (employee: Employee) => {
    console.log('Opening delete modal for employee:', employee.user.name);
    setSelectedEmployee(employee);
    setDeleteModalOpen(true);
  };
  
  // Handler untuk melihat detail karyawan
  const handleViewEmployeeDetail = (employeeId: string) => {
    console.log('Navigating to employee detail:', employeeId);
    router.push(`/employee/${employeeId}`);
  };
  
  // Handler untuk menambah karyawan baru
  const handleAddEmployee = async (data: unknown) => {
    try {
      console.log('Data yang diterima dari modal:', data);
      
      // Periksa apakah data yang diperlukan tersedia
      if (!data || typeof data !== 'object' || !('name' in data) || !('email' in data) || !('idNumber' in data)) {
        console.error('Data wajib tidak tersedia:', data);
        toast.error('Data karyawan tidak lengkap');
        return;
      }
      
      // Gunakan endpoint baru yang menangani pendaftaran user dan employee sekaligus
      const response = await fetch('/api/employees/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        let errorMessage = 'Gagal menambahkan karyawan';
        
        // Coba parse response sebagai JSON
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            console.log('Error response data:', errorData);
            
            if (errorData.error) {
              errorMessage = errorData.error;
            }
            
            if (errorData.details) {
              console.error('Validation errors:', errorData.details);
              // Tampilkan detail validasi jika ada
              if (Array.isArray(errorData.details) && errorData.details.length > 0) {
                const firstError = errorData.details[0];
                if (firstError.message) {
                  errorMessage = firstError.message;
                }
              }
            }
          } else {
            // Jika response bukan JSON, baca sebagai text
            const errorText = await response.text();
            console.log('Error response text:', errorText);
            errorMessage = errorText || `HTTP Error ${response.status}`;
          }
        } catch (parseError) {
          console.error('Error parsing error response:', parseError);
          errorMessage = `Gagal menambahkan karyawan (HTTP ${response.status})`;
        }
        
        throw new Error(errorMessage);
      }
      
      const employeeData = await response.json();
      console.log('Karyawan berhasil dibuat:', employeeData);
      
      toast.success('Karyawan berhasil ditambahkan');
      fetchEmployees(); // Refresh data
      setAddModalOpen(false);
    } catch (error: unknown) {
      console.error('Error adding employee:', error);
      const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan saat membuat karyawan';
      toast.error(errorMessage);
    }
  };
  
  // Handler untuk mengubah status SP
  const handleChangeWarningStatus = async (data: WarningStatusFormValues, employeeId: string) => {
    try {
      console.log("Mengubah status SP karyawan:", data);
      
      // Kirim data sekaligus (perubahan status dan riwayat)
      const response = await fetch(`/api/employees/${employeeId}/warning-status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          warningStatus: data.warningStatus,
          startDate: data.startDate,
          endDate: data.endDate,
          reason: data.reason,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Gagal mengubah status SP');
      }
      
      const responseData = await response.json();
      
      if (responseData.success) {
        toast.success('Status SP berhasil diubah dan riwayat disimpan');
        setWarningModalOpen(false);
        setSelectedEmployee(null);
        fetchEmployees(); // Refresh data
      } else {
        throw new Error(responseData.message || 'Gagal mengubah status SP');
      }
    } catch (error: unknown) {
      console.error('Error updating warning status:', error);
      const errorMessage = error instanceof Error ? error.message : 'Gagal mengubah status SP';
      toast.error(errorMessage);
      throw error; // Re-throw untuk ditangkap oleh modal
    }
  };
  
  // Handler untuk mengubah shift
  const handleChangeShift = async (data: ShiftChangeFormValues, employeeId: string) => {
    try {
      console.log(`Updating shift for employee ${employeeId} with data:`, data);
      
      // Kirim permintaan ke endpoint shift-history
      const response = await fetch(`/api/employees/${employeeId}/shift-history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shiftId: data.shift,
          effectiveDate: data.effectiveDate,
          notes: data.notes || ''
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Gagal mengubah shift');
      }
      
      const responseData = await response.json();
      
      if (responseData.success) {
        toast.success('Shift berhasil diubah dan riwayat disimpan');
        setShiftModalOpen(false);
        setSelectedEmployee(null);
        fetchEmployees(); // Refresh data
      } else {
        throw new Error(responseData.message || 'Gagal mengubah shift');
      }
    } catch (error: unknown) {
      console.error('Error updating shift:', error);
      const errorMessage = error instanceof Error ? error.message : 'Gagal mengubah shift';
      toast.error(errorMessage);
      throw error; // Re-throw untuk ditangkap oleh modal
    }
  };

  // Mendapatkan status badge berdasarkan warningStatus
  const getWarningStatusBadge = (status: string) => {
    switch (status) {
      case 'NONE':
        return <Badge variant="outline">Tidak Ada SP</Badge>;
      case 'SP1':
        return <Badge variant="default">SP 1</Badge>;
      case 'SP2':
        return <Badge variant="secondary">SP 2</Badge>;
      case 'SP3':
        return <Badge variant="destructive">SP 3</Badge>;
      default:
        return <Badge variant="outline">-</Badge>;
    }
  };

  // Mendapatkan status badge berdasarkan contractType
  const getContractBadge = (contractType: string) => {
    switch (contractType) {
      case 'PERMANENT':
        return <Badge variant="default">Permanen</Badge>;
      case 'TRAINING':
        return <Badge variant="secondary">Training</Badge>;
      default:
        return <Badge variant="outline">-</Badge>;
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Manajemen Karyawan</h1>
        <Button onClick={() => setAddModalOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Tambah Karyawan
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Daftar Karyawan</CardTitle>
          <CardDescription>
            Kelola data karyawan dan kontrak karyawan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between mb-4 gap-4">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari karyawan..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Filter className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[200px]">
                  <div className="p-2">
                    <div className="mb-2">
                      <label className="text-xs font-medium mb-1 block">Departemen</label>
                      <Select 
                        value={filterDepartment} 
                        onValueChange={setFilterDepartment}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Semua" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">Semua</SelectItem>
                          {departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id}>
                              {dept.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="mb-2">
                      <label className="text-xs font-medium mb-1 block">Status Kontrak</label>
                      <Select 
                        value={filterContractType} 
                        onValueChange={setFilterContractType}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Semua" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">Semua</SelectItem>
                          <SelectItem value="PERMANENT">Permanen</SelectItem>
                          <SelectItem value="TRAINING">Training</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            <div className="flex gap-2">
              {selectedEmployees.length > 0 && (
                <>
                  <Button variant="outline" onClick={handleBulkShiftChange}>
                    <Users className="mr-2 h-4 w-4" />
                    Ubah Shift ({selectedEmployees.length})
                  </Button>
                  <Button variant="outline" onClick={() => setHistoryModalOpen(true)}>
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    Riwayat
                  </Button>
                </>
              )}
              <Button variant="outline" onClick={handleExportExcel}>
                <FileDown className="mr-2 h-4 w-4" />
                Export Excel
              </Button>
            </div>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Memuat data karyawan...</span>
            </div>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectAll}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        aria-label="Select all employees"
                      />
                    </TableHead>
                    <TableHead>NIK</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Departemen</TableHead>
                    <TableHead>Posisi</TableHead>
                    <TableHead>Kontrak</TableHead>
                    <TableHead>Kontrak Berakhir</TableHead>
                    <TableHead>Shift</TableHead>
                    <TableHead>Status SP</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedEmployees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                        Tidak ada data karyawan yang ditemukan
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedEmployees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedEmployees.includes(employee.id)}
                            onChange={(e) => handleSelectEmployee(employee.id, e.target.checked)}
                            aria-label={`Select ${employee.user.name}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{employee.employeeId}</TableCell>
                        <TableCell>
                          <div className="font-medium">{employee.user.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {employee.gender === "MALE" ? "Laki-laki" : "Perempuan"}
                          </div>
                        </TableCell>
                        <TableCell>{employee.user.email}</TableCell>
                        <TableCell>
                          <div>{employee.department.name}</div>
                          {employee.subDepartment && (
                            <div className="text-xs text-muted-foreground">
                              {employee.subDepartment.name}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{employee.position?.name || '-'}</TableCell>
                        <TableCell>
                          {getContractBadge(employee.contractType)}
                          <div className="text-xs text-muted-foreground mt-1">
                            {employee.contractType === 'PERMANENT' 
                              ? `Kontrak: ${employee.contractNumber || '-'}` 
                              : `Training: ${employee.contractNumber || '-'}`}
                          </div>
                        </TableCell>
                        <TableCell>
                          {employee.contractEndDate 
                            ? new Date(employee.contractEndDate).toLocaleDateString('id-ID')
                            : 'Permanen'}
                        </TableCell>
                        <TableCell>{employee.shift.name}</TableCell>
                        <TableCell>
                          {getWarningStatusBadge(employee.warningStatus)}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                •••
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewEmployeeDetail(employee.id)}>
                                Lihat Detail
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOpenWarningModal(employee)}>
                                Ubah Status SP
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOpenShiftModal(employee)}>
                                Ubah Shift
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleOpenDeleteModal(employee)}
                                className="text-destructive"
                              >
                                Hapus Karyawan
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Menampilkan {startIndex + 1}-{Math.min(endIndex, totalItems)} dari {totalItems} karyawan
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                      Halaman {currentPage} dari {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Modal untuk menambah karyawan */}
      <AddEmployeeModal 
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        onSubmit={handleAddEmployee}
        departments={departments}
        positions={positions}
      />
      
      {/* Modal untuk mengubah status SP */}
      {selectedEmployee && (
        <WarningStatusModal 
          open={warningModalOpen}
          onOpenChange={setWarningModalOpen}
          employeeId={selectedEmployee.id}
          employeeName={selectedEmployee.user.name}
          currentStatus={selectedEmployee.warningStatus}
          onSubmit={handleChangeWarningStatus}
        />
      )}
      
      {/* Modal untuk mengubah shift */}
      {selectedEmployee && (
        <ShiftChangeModal 
          open={shiftModalOpen}
          onOpenChange={setShiftModalOpen}
          employeeName={selectedEmployee.user?.name}
          employeeId={selectedEmployee.id}
          currentShift={selectedEmployee.shift?.name}
          subDepartmentId={selectedEmployee.subDepartmentId}
          onSubmit={handleChangeShift}
        />
      )}
      
      {/* Modal untuk menghapus karyawan */}
      {selectedEmployee && (
        <DeleteEmployeeModal 
          open={deleteModalOpen}
          onOpenChange={setDeleteModalOpen}
          employeeId={selectedEmployee.id}
          employeeName={selectedEmployee.user.name}
          onSuccess={fetchEmployees}
        />
      )}

      {/* Modal untuk bulk shift change */}
      <BulkShiftChangeModal
        open={bulkShiftModalOpen}
        onOpenChange={setBulkShiftModalOpen}
        selectedEmployeeIds={selectedEmployees}
        onSuccess={() => {
          fetchEmployees();
          setSelectedEmployees([]);
          setSelectAll(false);
        }}
      />

      {/* Modal untuk employee history */}
      <EmployeeHistoryModal
        open={historyModalOpen}
        onOpenChange={setHistoryModalOpen}
        expiringContracts={expiringContracts}
      />
    </div>
  );
} 