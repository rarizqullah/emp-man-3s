"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  Search,
  FileDown,
  Loader2,
  Users,
  RotateCcw,
  Trash2
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
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Tipe data untuk karyawan yang diarsipkan
interface ArchivedEmployee {
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
  deletedAt: string;
  deletedBy?: string;
  deletionReason?: string;
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

export default function EmployeeArchivePage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("ALL");
  const [filterContractType, setFilterContractType] = useState("ALL");
  
  // State untuk data dari API - initialize with empty array and ensure it stays an array
  const [archivedEmployeesState, setArchivedEmployeesState] = useState<ArchivedEmployee[]>([]);
  
  // Always ensure archivedEmployees is an array
  const archivedEmployees = useMemo(() => {
    return Array.isArray(archivedEmployeesState) ? archivedEmployeesState : [];
  }, [archivedEmployeesState]);
  
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State untuk menyimpan data karyawan yang sedang dipilih
  const [selectedEmployee, setSelectedEmployee] = useState<ArchivedEmployee | null>(null);
  
  // State untuk multiple selection
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  
  // State untuk pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  // State untuk modal konfirmasi
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [permanentDeleteDialogOpen, setPermanentDeleteDialogOpen] = useState(false);
  const [bulkActionDialogOpen, setBulkActionDialogOpen] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<'restore' | 'delete'>('restore');
  
  // Fetch data karyawan yang diarsipkan dari API
  const fetchArchivedEmployees = useCallback(async (retryCount = 0) => {
    const maxRetries = 3;
    
    try {
      setLoading(true);
      
      const response = await fetch('/api/employees/archive', {
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (
          errorData.code === 'DB_CONNECTION_ERROR' &&
          retryCount < maxRetries
        ) {
          console.log(`Database connection error, retry ${retryCount + 1}/${maxRetries}`);
          await new Promise(resolve => setTimeout(resolve, 3000 * (retryCount + 1)));
          return fetchArchivedEmployees(retryCount + 1);
        }
        
        throw new Error(errorData.error || 'Gagal mengambil data karyawan yang diarsipkan');
      }
      
      const data = await response.json();
      
      // Handle response format: { success: true, data: [...] }
      if (data.success && Array.isArray(data.data)) {
        setArchivedEmployeesState(data.data);
      } else if (Array.isArray(data)) {
        // Handle direct array response
        setArchivedEmployeesState(data);
      } else {
        console.warn('Unexpected response format:', data);
        setArchivedEmployeesState([]);
      }
      
      if (retryCount > 0) {
        toast.success('Berhasil memuat data karyawan yang diarsipkan setelah retry');
      }
      
    } catch (error) {
      console.error('Error fetching archived employees:', error);
      
      if (retryCount < maxRetries && !String(error).includes('Unexpected token')) {
        console.log(`Retry ${retryCount + 1}/${maxRetries} after error:`, error);
        toast.warning(`Gagal memuat data, mencoba lagi... (${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 3000 * (retryCount + 1)));
        return fetchArchivedEmployees(retryCount + 1);
      }
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(`Gagal memuat data karyawan yang diarsipkan: ${errorMessage}`, {
        duration: 6000,
        action: {
          label: "Coba Lagi",
          onClick: () => fetchArchivedEmployees(0)
        }
      });
      
      setArchivedEmployeesState([]);
    } finally {
      setLoading(false);
    }
  }, []);
  
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

  // Export to Excel function
  const handleExportExcel = () => {
    try {
      // Ensure we have valid filtered employees
      const employees = Array.isArray(filteredEmployees) ? filteredEmployees : [];
      
      if (employees.length === 0) {
        toast.error('Tidak ada data untuk diekspor');
        return;
      }
      
      const exportData = employees.map((emp, index) => ({
        'No': index + 1,
        'NIK': emp.employeeId || '-',
        'Nama Lengkap': emp.user?.name || '-',
        'Email': emp.user?.email || '-',
        'Jenis Kelamin': emp.gender === 'MALE' ? 'Laki-laki' : 'Perempuan',
        'Alamat': emp.address || '-',
        'Departemen': emp.department?.name || '-',
        'Sub Departemen': emp.subDepartment?.name || '-',
        'Posisi': emp.position?.name || '-',
        'Level Posisi': emp.position?.level || '-',
        'Shift': emp.shift?.name || '-',
        'Tipe Shift': emp.shift?.shiftType || '-',
        'Tipe Kontrak': emp.contractType === 'PERMANENT' ? 'Permanen' : 'Training',
        'Nomor Kontrak': emp.contractNumber || '-',
        'Tanggal Mulai Kontrak': emp.contractStartDate ? new Date(emp.contractStartDate).toLocaleDateString('id-ID') : '-',
        'Tanggal Berakhir Kontrak': emp.contractEndDate ? new Date(emp.contractEndDate).toLocaleDateString('id-ID') : 'Permanen',
        'Status SP': emp.warningStatus === 'NONE' ? 'Tidak Ada SP' : (emp.warningStatus || 'Tidak Diketahui'),
        'Tanggal Dihapus': emp.deletedAt ? new Date(emp.deletedAt).toLocaleDateString('id-ID') : '-',
        'Dihapus Oleh': emp.deletedBy || '-',
        'Alasan Penghapusan': emp.deletionReason || '-',
        'Tanggal Dibuat': emp.createdAt ? new Date(emp.createdAt).toLocaleDateString('id-ID') : '-',
        'Terakhir Diupdate': emp.updatedAt ? new Date(emp.updatedAt).toLocaleDateString('id-ID') : '-'
      }));

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
        { wch: 20 }, // Tanggal Dihapus
        { wch: 20 }, // Dihapus Oleh
        { wch: 30 }, // Alasan Penghapusan
        { wch: 15 }, // Dibuat
        { wch: 15 }  // Update
      ];
      ws['!cols'] = colWidths;
      
      XLSX.utils.book_append_sheet(wb, ws, 'Arsip Karyawan');
      
      const fileName = `Arsip_Karyawan_${new Date().toISOString().split('T')[0]}.xlsx`;
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
      const employees = Array.isArray(paginatedEmployees) ? paginatedEmployees : [];
      setSelectedEmployees(employees.map(emp => emp.id));
    } else {
      setSelectedEmployees([]);
    }
  };

  // Handle restore employee
  const handleRestoreEmployee = async (employeeId: string) => {
    try {
      const response = await fetch(`/api/employees/archive/${employeeId}/restore`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Gagal memulihkan karyawan');
      }

      toast.success('Karyawan berhasil dipulihkan');
      setRestoreDialogOpen(false);
      setSelectedEmployee(null);
      fetchArchivedEmployees();
    } catch (error) {
      console.error('Error restoring employee:', error);
      const errorMessage = error instanceof Error ? error.message : 'Gagal memulihkan karyawan';
      toast.error(errorMessage);
    }
  };

  // Handle permanent delete employee
  const handlePermanentDeleteEmployee = async (employeeId: string) => {
    try {
      const response = await fetch(`/api/employees/archive/${employeeId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Gagal menghapus permanen karyawan');
      }

      toast.success('Karyawan berhasil dihapus permanen');
      setPermanentDeleteDialogOpen(false);
      setSelectedEmployee(null);
      fetchArchivedEmployees();
    } catch (error) {
      console.error('Error permanently deleting employee:', error);
      const errorMessage = error instanceof Error ? error.message : 'Gagal menghapus permanen karyawan';
      toast.error(errorMessage);
    }
  };

  // Handle bulk actions
  const handleBulkAction = async (action: 'restore' | 'delete') => {
    if (selectedEmployees.length === 0) {
      toast.error('Pilih minimal satu karyawan');
      return;
    }

    try {
      const endpoint = action === 'restore' 
        ? '/api/employees/archive/bulk-restore' 
        : '/api/employees/archive/bulk-delete';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeIds: selectedEmployees,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Gagal ${action === 'restore' ? 'memulihkan' : 'menghapus'} karyawan`);
      }

      const message = action === 'restore' 
        ? `${selectedEmployees.length} karyawan berhasil dipulihkan`
        : `${selectedEmployees.length} karyawan berhasil dihapus permanen`;

      toast.success(message);
      setBulkActionDialogOpen(false);
      setSelectedEmployees([]);
      setSelectAll(false);
      fetchArchivedEmployees();
    } catch (error) {
      console.error(`Error ${action} employees:`, error);
      const errorMessage = error instanceof Error ? error.message : `Gagal ${action === 'restore' ? 'memulihkan' : 'menghapus'} karyawan`;
      toast.error(errorMessage);
    }
  };
  
  // Memuat data saat komponen dimount
  useEffect(() => {
    fetchArchivedEmployees();
    fetchDepartments();
  }, [fetchArchivedEmployees]);
  
  // Filter karyawan berdasarkan pencarian dan filter
  const filteredEmployees = useMemo(() => {
    // Ensure archivedEmployees is always an array
    const employees = Array.isArray(archivedEmployees) ? archivedEmployees : [];
    
    return employees.filter(employee => {
      try {
        const matchesSearch = 
          employee.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          employee.employeeId?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesDepartment = filterDepartment === "ALL" || employee.department?.id === filterDepartment;
        const matchesContractType = filterContractType === "ALL" || employee.contractType === filterContractType;
        
        return matchesSearch && matchesDepartment && matchesContractType;
      } catch (error) {
        console.error('Error filtering employee:', employee, error);
        return false;
      }
    });
  }, [archivedEmployees, searchTerm, filterDepartment, filterContractType]);

  // Pagination logic
  const totalItems = filteredEmployees.length;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedEmployees = filteredEmployees.slice(startIndex, endIndex);

  // Update total pages when filtered employees change
  useEffect(() => {
    const newTotalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
    setTotalPages(newTotalPages);
    
    if (currentPage > newTotalPages && newTotalPages > 0) {
      setCurrentPage(1);
    }
  }, [filteredEmployees.length, itemsPerPage, currentPage]);
  
  // Helper functions untuk badge
  const getContractBadge = (contractType: string) => {
    switch (contractType) {
      case "PERMANENT":
        return <Badge variant="default">Permanen</Badge>;
      case "TRAINING":
        return <Badge variant="secondary">Training</Badge>;
      default:
        return <Badge variant="outline">{contractType}</Badge>;
    }
  };

  const getWarningStatusBadge = (status: string) => {
    switch (status) {
      case "NONE":
        return <Badge variant="outline">Tidak Ada SP</Badge>;
      case "SP1":
        return <Badge variant="destructive">SP 1</Badge>;
      case "SP2":
        return <Badge variant="destructive">SP 2</Badge>;
      case "SP3":
        return <Badge variant="destructive">SP 3</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="typography-h1">Arsip Karyawan</h1>
          <p className="typography-muted mt-2">
            Kelola data karyawan yang telah dihapus dan dapat dipulihkan
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push('/employee')}>
          <Users className="mr-2 h-4 w-4" />
          Kembali ke Manajemen Karyawan
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Karyawan yang Diarsipkan</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Summary info */}
          <div className="mb-4 text-sm text-muted-foreground">
            Menampilkan {startIndex + 1}-{Math.min(endIndex, filteredEmployees.length)} dari {filteredEmployees.length} karyawan yang diarsipkan
          </div>

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
                    <Search className="h-4 w-4" />
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
                  <Button variant="outline" onClick={() => {
                    setBulkActionType('restore');
                    setBulkActionDialogOpen(true);
                  }}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Pulihkan ({selectedEmployees.length})
                  </Button>
                  <Button variant="destructive" onClick={() => {
                    setBulkActionType('delete');
                    setBulkActionDialogOpen(true);
                  }}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Hapus Permanen ({selectedEmployees.length})
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
              <span className="ml-2">Memuat data karyawan yang diarsipkan...</span>
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
                    <TableHead className="px-4 py-3 font-semibold text-muted-foreground">Shift</TableHead>
                    <TableHead className="px-4 py-3 font-semibold text-muted-foreground">Status SP</TableHead>
                    <TableHead className="px-4 py-3 font-semibold text-muted-foreground">Tanggal Dihapus</TableHead>
                    <TableHead className="px-4 py-3 font-semibold text-muted-foreground text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedEmployees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <Users className="h-8 w-8 text-muted-foreground" />
                          <div>
                            <p className="font-medium">Tidak ada karyawan yang diarsipkan</p>
                            <p className="text-sm text-muted-foreground">
                              {filteredEmployees.length === 0 && archivedEmployees.length === 0
                                ? "Belum ada karyawan yang dihapus"
                                : "Tidak ada data yang sesuai dengan filter pencarian"
                              }
                            </p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedEmployees.map((employee) => (
                      <TableRow key={employee.id} className="hover:bg-muted/50 transition-colors border-b last:border-b-0">
                        <TableCell className="px-4 py-4">
                          <Checkbox
                            checked={selectedEmployees.includes(employee.id)}
                            onChange={(e) => handleSelectEmployee(employee.id, e.target.checked)}
                            aria-label={`Select ${employee.user?.name || 'Employee'}`}
                          />
                        </TableCell>
                        <TableCell className="px-4 py-4 font-medium">{employee.employeeId || '-'}</TableCell>
                        <TableCell className="px-4 py-4">
                          <div className="font-medium">{employee.user?.name || '-'}</div>
                          <div className="text-xs text-muted-foreground">
                            {employee.gender === "MALE" ? "Laki-laki" : "Perempuan"}
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-4">{employee.user?.email || '-'}</TableCell>
                        <TableCell className="px-4 py-4">
                          <div>{employee.department?.name || '-'}</div>
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
                        <TableCell className="px-4 py-4">{employee.shift?.name || '-'}</TableCell>
                        <TableCell className="px-4 py-4">
                          {getWarningStatusBadge(employee.warningStatus)}
                        </TableCell>
                        <TableCell className="px-4 py-4">
                          <div className="text-sm">
                            {employee.deletedAt ? new Date(employee.deletedAt).toLocaleDateString('id-ID') : '-'}
                          </div>
                          {employee.deletedBy && (
                            <div className="text-xs text-muted-foreground">
                              Oleh: {employee.deletedBy}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="px-4 py-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                •••
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {
                                setSelectedEmployee(employee);
                                setRestoreDialogOpen(true);
                              }}>
                                <RotateCcw className="mr-2 h-4 w-4" />
                                Pulihkan Karyawan
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => {
                                  setSelectedEmployee(employee);
                                  setPermanentDeleteDialogOpen(true);
                                }}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Hapus Permanen
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

      {/* Dialog konfirmasi pulihkan karyawan */}
      <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pulihkan Karyawan</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin memulihkan karyawan <strong>{selectedEmployee?.user?.name || 'Unknown'}</strong>? 
              Karyawan ini akan dikembalikan ke daftar karyawan aktif.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => selectedEmployee && handleRestoreEmployee(selectedEmployee.id)}
            >
              Pulihkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog konfirmasi hapus permanen */}
      <AlertDialog open={permanentDeleteDialogOpen} onOpenChange={setPermanentDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Permanen Karyawan</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus permanen karyawan <strong>{selectedEmployee?.user?.name || 'Unknown'}</strong>? 
              Tindakan ini tidak dapat dibatalkan dan semua data akan hilang selamanya.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => selectedEmployee && handlePermanentDeleteEmployee(selectedEmployee.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus Permanen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog konfirmasi bulk action */}
      <AlertDialog open={bulkActionDialogOpen} onOpenChange={setBulkActionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bulkActionType === 'restore' ? 'Pulihkan Karyawan' : 'Hapus Permanen Karyawan'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {bulkActionType === 'restore' 
                ? `Apakah Anda yakin ingin memulihkan ${selectedEmployees.length} karyawan yang dipilih? Mereka akan dikembalikan ke daftar karyawan aktif.`
                : `Apakah Anda yakin ingin menghapus permanen ${selectedEmployees.length} karyawan yang dipilih? Tindakan ini tidak dapat dibatalkan.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => handleBulkAction(bulkActionType)}
              className={bulkActionType === 'delete' ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              {bulkActionType === 'restore' ? 'Pulihkan' : 'Hapus Permanen'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 
