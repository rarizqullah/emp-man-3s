"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Search,
  FileDown,
  UserPlus,
  Filter,
  Loader2,
  Users,
  ChevronDown,
  Clock,
  AlertTriangle,
  TrendingUp,
  Building,
  Database,
  Mail,
  Archive,
  Trash2,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
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
  DropdownMenuSeparator,
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
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

// Import modals
import { AddEmployeeModal } from "@/components/employee/AddEmployeeModal";
import { WarningStatusModal } from "@/components/employee/WarningStatusModal";
import { ShiftChangeModal } from "@/components/employee/ShiftChangeModal";
import { DeleteEmployeeModal } from "@/components/employee/DeleteEmployeeModal";
import { BulkShiftChangeModal } from "@/components/employee/BulkShiftChangeModal";
// High Priority Bulk Operations Modals
import { BulkWarningStatusModal } from "@/components/employee/BulkWarningStatusModal";
import { BulkDeleteModal } from "@/components/employee/BulkDeleteModal";
import { EnhancedExportModal } from "@/components/employee/EnhancedExportModal";
import { GroupAnalyticsModal } from "@/components/employee/GroupAnalyticsModal";

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
  
  // State untuk bulk operations - ENHANCED
  const [bulkWarningModalOpen, setBulkWarningModalOpen] = useState(false);
  const [bulkPositionModalOpen, setBulkPositionModalOpen] = useState(false);
  const [bulkDepartmentModalOpen, setBulkDepartmentModalOpen] = useState(false);
  const [bulkArchiveModalOpen, setBulkArchiveModalOpen] = useState(false);
  const [bulkNotificationModalOpen, setBulkNotificationModalOpen] = useState(false);
  const [enhancedExportModalOpen, setEnhancedExportModalOpen] = useState(false);
  // High Priority Bulk Operations State
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
  const [groupAnalyticsModalOpen, setGroupAnalyticsModalOpen] = useState(false);
  
  // State untuk data dari API
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State untuk menyimpan data karyawan yang sedang diedit
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  
  // State untuk multiple selection
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  
  // State untuk pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  
  // Fetch data karyawan dari API dengan retry logic
  const fetchEmployees = async (retryCount = 0, forceRefresh = false) => {
    const maxRetries = 3;
    
    try {
      // Loading state dikelola di level component untuk parallel fetch
      if (forceRefresh) setLoading(true);
      
      // Force refresh mode untuk setelah archive
      if (forceRefresh) {
        console.log('🔄 Force refreshing employee data...');
        // Clear any existing state
        setEmployees([]);
        setSelectedEmployees([]);
        setSelectAll(false);
      }
      
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
      
      // Gunakan parameter pagination untuk initial load
      const searchParams = new URLSearchParams({
        take: '100', // Load lebih banyak untuk initial load
        skip: '0'
      });
      
      const response = await fetch(`/api/employees?${searchParams}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Timestamp': Date.now().toString(),
        },
        cache: 'no-store'
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
      
      const responseData = await response.json();
      
      // Handle new pagination structure
      const employeesData = responseData.data || responseData; // Support both old and new structure
      const paginationInfo = responseData.pagination;
      
      // Optimized logging - hanya log summary, bukan data lengkap
      console.log(`📊 Fetched ${employeesData.length} employees (first 3: ${employeesData.slice(0, 3).map((emp: Employee) => emp.employeeId).join(', ')})`);
      
      if (paginationInfo) {
        console.log(`📄 Pagination:`, { 
          total: paginationInfo.total, 
          take: paginationInfo.take, 
          skip: paginationInfo.skip,
          hasMore: paginationInfo.hasMore 
        });
      }
      
      setEmployees(employeesData);
      
      // Reset pagination saat data berubah
      setCurrentPage(1);
      setSelectedEmployees([]);
      setSelectAll(false);
      
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
      
      // Jika semua retry gagal, tampilkan error dan kosongkan data
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(`Gagal memuat data karyawan: ${errorMessage}`, {
        duration: 6000,
        action: {
          label: "Coba Lagi",
          onClick: () => fetchEmployees(0)
        }
      });
      
      // Set data kosong ketika error
      setEmployees([]);
    } finally {
      // Loading hanya di-reset jika force refresh
      if (forceRefresh) setLoading(false);
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
      toast.error('Gagal memuat data departemen', {
        duration: 4000
      });
      setDepartments([]);
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
  
  // Enhanced bulk operations handlers
  const handleBulkWarningChange = () => {
    if (selectedEmployees.length === 0) {
      toast.error('Pilih minimal satu karyawan untuk mengubah status SP');
      return;
    }
    setBulkWarningModalOpen(true);
  };

  const handleBulkPositionChange = () => {
    if (selectedEmployees.length === 0) {
      toast.error('Pilih minimal satu karyawan untuk mengubah posisi');
      return;
    }
    setBulkPositionModalOpen(true);
  };

  const handleBulkDepartmentChange = () => {
    if (selectedEmployees.length === 0) {
      toast.error('Pilih minimal satu karyawan untuk pindah departemen');
      return;
    }
    setBulkDepartmentModalOpen(true);
  };

  const handleBulkArchive = () => {
    if (selectedEmployees.length === 0) {
      toast.error('Pilih minimal satu karyawan untuk diarsipkan');
      return;
    }
    setBulkArchiveModalOpen(true);
  };

  const handleBulkNotification = () => {
    if (selectedEmployees.length === 0) {
      toast.error('Pilih minimal satu karyawan untuk dikirim notifikasi');
      return;
    }
    setBulkNotificationModalOpen(true);
  };

  const handleEnhancedExport = () => {
    if (selectedEmployees.length === 0) {
      toast.error('Pilih minimal satu karyawan untuk diekspor');
      return;
    }
    setEnhancedExportModalOpen(true);
  };

  // High Priority Bulk Operations Handlers
  const handleBulkDelete = () => {
    if (selectedEmployees.length === 0) {
      toast.error('Pilih minimal satu karyawan untuk dihapus permanen');
      return;
    }
    setBulkDeleteModalOpen(true);
  };

  const handleGroupAnalytics = () => {
    if (selectedEmployees.length === 0) {
      toast.error('Pilih minimal satu karyawan untuk melihat analytics');
      return;
    }
    setGroupAnalyticsModalOpen(true);
  };
  
  // Memuat data saat komponen dimount dengan parallel loading
  useEffect(() => {
    const loadAllData = async () => {
      try {
        setLoading(true);
        // Load semua data secara parallel untuk performance optimal
        await Promise.all([
          fetchEmployees(),
          fetchDepartments(),
          fetchPositions()
        ]);
        console.log('✅ Semua data berhasil dimuat secara parallel');
      } catch (error) {
        console.error('❌ Error saat memuat data parallel:', error);
        toast.error('Gagal memuat beberapa data. Mencoba refresh...', {
          duration: 4000
        });
      } finally {
        setLoading(false);
      }
    };

    loadAllData();
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

  // Check for expiring contracts when employees data is loaded
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
  
  // Check for expiring contracts - simplified notification without history modal
  const checkExpiringContracts = (employeeData: Employee[]) => {
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);
    
    const expiring = employeeData.filter(emp => {
      if (!emp.contractEndDate) return false;
      const endDate = new Date(emp.contractEndDate);
      return endDate <= thirtyDaysFromNow && endDate >= today;
    });
    
    if (expiring.length > 0) {
      toast.warning(`${expiring.length} kontrak karyawan akan berakhir dalam 30 hari`, {
        duration: 8000
      });
    }
  };

  // Export to Excel function dengan dynamic import
  const handleExportExcel = async () => {
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

      // Dynamic import untuk XLSX
      const { utils, writeFile } = await import('xlsx');

      // Create workbook and worksheet
      const ws = utils.json_to_sheet(exportData);
      const wb = utils.book_new();
      
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
      
      utils.book_append_sheet(wb, ws, 'Data Karyawan');
      
      // Generate filename with current date
      const fileName = `Data_Karyawan_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      // Save file
      writeFile(wb, fileName);
      
      toast.success(`Data berhasil diekspor ke ${fileName}`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Gagal mengekspor data ke Excel');
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="typography-h1">Manajemen Karyawan</h1>
          <p className="typography-muted mt-2">Kelola data karyawan dan kontrak karyawan</p>
        </div>
        <Button onClick={() => setAddModalOpen(true)} className="bg-slate-900 hover:bg-slate-800 text-white">
          <UserPlus className="mr-2 h-4 w-4" />
          Tambah Karyawan
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="typography-h3">Daftar Karyawan</CardTitle>
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
                  {/* HR Operations Group */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="text-slate-700 border-slate-200 hover:bg-slate-50" size="sm">
                    <Users className="mr-2 h-4 w-4" />
                        Operasi HR ({selectedEmployees.length})
                        <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      <DropdownMenuItem onClick={handleBulkShiftChange}>
                        <Clock className="mr-2 h-4 w-4 text-slate-600" />
                        Ubah Shift
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleBulkWarningChange}>
                        <AlertTriangle className="mr-2 h-4 w-4 text-slate-600" />
                        Ubah Status SP
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleBulkPositionChange}>
                        <TrendingUp className="mr-2 h-4 w-4 text-slate-600" />
                        Ubah Posisi
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleBulkDepartmentChange}>
                        <Building className="mr-2 h-4 w-4 text-slate-600" />
                        Pindah Departemen
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Data Management Group */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="text-slate-700 border-slate-200 hover:bg-slate-50" size="sm">
                        <Database className="mr-2 h-4 w-4" />
                        Data Management ({selectedEmployees.length})
                        <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      <DropdownMenuItem onClick={handleEnhancedExport}>
                        <FileDown className="mr-2 h-4 w-4 text-slate-600" />
                        Enhanced Export
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleGroupAnalytics}>
                        <TrendingUp className="mr-2 h-4 w-4 text-slate-600" />
                        Group Analytics
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleBulkNotification}>
                        <Mail className="mr-2 h-4 w-4 text-slate-600" />
                        Kirim Notifikasi
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleBulkArchive} className="text-slate-600">
                        <Archive className="mr-2 h-4 w-4" />
                        Arsipkan Karyawan
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleBulkDelete} className="text-slate-700 hover:text-red-600">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Hapus Permanen
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
              
              {/* Regular Export - Always Available */}
              <Button variant="outline" className="text-slate-700 border-slate-200 hover:bg-slate-50" size="sm" onClick={handleExportExcel}>
                <FileDown className="mr-2 h-4 w-4" />
                Export Semua
              </Button>
              
              {/* Refresh Button */}
              <Button 
                variant="outline" 
                className="text-slate-700 border-slate-200 hover:bg-slate-50"
                onClick={() => {
                  console.log('🔄 Manual refresh triggered');
                  fetchEmployees(0, true);
                  toast.info("🔄 Memperbarui data karyawan...");
                }}
                size="sm"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Memuat data karyawan...</span>
            </div>
          ) : (
            <div className="rounded-md border bg-background shadow-sm">
              <Table>
                <TableHeader className="bg-muted/50 border-b">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-12 px-4 py-3 font-semibold text-muted-foreground">
                      <Checkbox
                        checked={selectAll}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        aria-label="Select all employees"
                      />
                    </TableHead>
                    <TableHead className="px-4 py-3 font-semibold text-muted-foreground">NIK</TableHead>
                    <TableHead className="px-4 py-3 font-semibold text-muted-foreground">Nama</TableHead>
                    <TableHead className="px-4 py-3 font-semibold text-muted-foreground">Email</TableHead>
                    <TableHead className="px-4 py-3 font-semibold text-muted-foreground">Departemen</TableHead>
                    <TableHead className="px-4 py-3 font-semibold text-muted-foreground">Posisi</TableHead>
                    <TableHead className="px-4 py-3 font-semibold text-muted-foreground">Kontrak</TableHead>
                    <TableHead className="px-4 py-3 font-semibold text-muted-foreground">Kontrak Berakhir</TableHead>
                    <TableHead className="px-4 py-3 font-semibold text-muted-foreground">Shift</TableHead>
                    <TableHead className="px-4 py-3 font-semibold text-muted-foreground">Status SP</TableHead>
                    <TableHead className="px-4 py-3 font-semibold text-muted-foreground text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedEmployees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                        Tidak ada data karyawan
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedEmployees.map((employee) => (
                      <TableRow key={employee.id} className="hover:bg-muted/50 transition-colors border-b last:border-b-0">
                        <TableCell className="px-4 py-4">
                          <Checkbox
                            checked={selectedEmployees.includes(employee.id)}
                            onChange={(e) => handleSelectEmployee(employee.id, e.target.checked)}
                            aria-label={`Select ${employee.user.name}`}
                          />
                        </TableCell>
                        <TableCell className="px-4 py-4 font-medium">{employee.employeeId}</TableCell>
                        <TableCell className="px-4 py-4">
                          <div className="font-medium">{employee.user.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {employee.gender === "MALE" ? "Laki-laki" : "Perempuan"}
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-4">{employee.user.email}</TableCell>
                        <TableCell className="px-4 py-4">
                          <div>{employee.department.name}</div>
                          {employee.subDepartment && (
                            <div className="text-xs text-muted-foreground">
                              {employee.subDepartment.name}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="px-4 py-4">{employee.position?.name || '-'}</TableCell>
                        <TableCell className="px-4 py-4">
                          {getContractBadge(employee.contractType)}
                          <div className="text-xs text-muted-foreground mt-1">
                            {employee.contractType === 'PERMANENT' 
                              ? `Kontrak: ${employee.contractNumber || '-'}` 
                              : `Training: ${employee.contractNumber || '-'}`}
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-4">
                          {employee.contractEndDate 
                            ? new Date(employee.contractEndDate).toLocaleDateString('id-ID')
                            : 'Permanen'}
                        </TableCell>
                        <TableCell className="px-4 py-4">{employee.shift.name}</TableCell>
                        <TableCell className="px-4 py-4">
                          {getWarningStatusBadge(employee.warningStatus)}
                        </TableCell>
                        <TableCell className="px-4 py-4 text-right">
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
              <DataTablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
                itemName="karyawan"
                showRowsPerPage={true}
                showFirstLastButtons={true}
                showPageNumbers={true}
                className="border-t"
              />
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
          onSuccess={() => fetchEmployees(0, true)}
        />
      )}

      {/* Modal untuk bulk shift change */}
      <BulkShiftChangeModal
        open={bulkShiftModalOpen}
        onOpenChange={setBulkShiftModalOpen}
        selectedEmployeeIds={selectedEmployees}
        onSuccess={() => {
          fetchEmployees(0, true);
          setSelectedEmployees([]);
          setSelectAll(false);
        }}
      />

      {/* Enhanced Bulk Operations Modals */}
      
      {/* Bulk Warning Status Modal */}
      <BulkWarningStatusModal
        isOpen={bulkWarningModalOpen}
        onClose={() => setBulkWarningModalOpen(false)}
        selectedEmployees={selectedEmployees}
        employeeNames={selectedEmployees.map(id => {
          const emp = employees.find(e => e.id === id);
          return emp?.user.name || 'Unknown';
        })}
        onSuccess={() => {
          fetchEmployees(0, true);
          setSelectedEmployees([]);
          setSelectAll(false);
        }}
      />

      {/* Bulk Position Change Modal */}
      <AlertDialog open={bulkPositionModalOpen} onOpenChange={setBulkPositionModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ubah Posisi - {selectedEmployees.length} Karyawan</AlertDialogTitle>
            <AlertDialogDescription>
              Fitur ini akan segera tersedia. Anda dapat mengubah posisi/jabatan multiple karyawan sekaligus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Tutup</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Department Transfer Modal */}
      <AlertDialog open={bulkDepartmentModalOpen} onOpenChange={setBulkDepartmentModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pindah Departemen - {selectedEmployees.length} Karyawan</AlertDialogTitle>
            <AlertDialogDescription>
              Fitur ini akan segera tersedia. Anda dapat memindahkan multiple karyawan ke departemen lain sekaligus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Tutup</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Archive Modal */}
      <AlertDialog open={bulkArchiveModalOpen} onOpenChange={setBulkArchiveModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arsipkan Karyawan - {selectedEmployees.length} Karyawan</AlertDialogTitle>
            <AlertDialogDescription>
              Fitur ini akan segera tersedia. Anda dapat mengarsipkan multiple karyawan sekaligus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Tutup</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Notification Modal */}
      <AlertDialog open={bulkNotificationModalOpen} onOpenChange={setBulkNotificationModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kirim Notifikasi - {selectedEmployees.length} Karyawan</AlertDialogTitle>
            <AlertDialogDescription>
              Fitur ini akan segera tersedia. Anda dapat mengirim notifikasi email/SMS ke multiple karyawan sekaligus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Tutup</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Enhanced Export Modal */}
      <EnhancedExportModal
        isOpen={enhancedExportModalOpen}
        onClose={() => setEnhancedExportModalOpen(false)}
        selectedEmployees={selectedEmployees}
        allEmployees={employees}
      />

      {/* High Priority Bulk Operations Modals */}
      
      {/* Bulk Delete Modal */}
      <BulkDeleteModal
        isOpen={bulkDeleteModalOpen}
        onClose={() => setBulkDeleteModalOpen(false)}
        selectedEmployees={selectedEmployees}
        employeeNames={selectedEmployees.map(id => {
          const emp = employees.find(e => e.id === id);
          return emp?.user.name || 'Unknown';
        })}
        onSuccess={() => {
          fetchEmployees(0, true);
          setSelectedEmployees([]);
          setSelectAll(false);
        }}
      />

      {/* Group Analytics Modal */}
      <GroupAnalyticsModal
        isOpen={groupAnalyticsModalOpen}
        onClose={() => setGroupAnalyticsModalOpen(false)}
        selectedEmployees={selectedEmployees}
        allEmployees={employees}
      />
    </div>
  );
} 