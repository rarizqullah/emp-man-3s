"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Search,
  FileDown,
  UserPlus,
  Filter,
  Loader2
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
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import { Employee, Department, Shift, SubDepartment } from "@/lib/types";
import { usePathname, useSearchParams } from "next/navigation";

// Import modals
import { AddEmployeeModal } from "@/components/employee/AddEmployeeModal";
import { WarningStatusModal } from "@/components/employee/WarningStatusModal";
import { ShiftChangeModal } from "@/components/employee/ShiftChangeModal";
import { DeleteEmployeeModal } from "@/components/employee/DeleteEmployeeModal";

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
  
  // State untuk data dari API
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State untuk menyimpan data karyawan yang sedang diedit
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  
  // Fetch data karyawan dari API
  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/employees');
      if (!response.ok) {
        throw new Error('Gagal mengambil data karyawan');
      }
      const data = await response.json();
      setEmployees(data);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Gagal mengambil data karyawan');
      
      // Gunakan data dummy jika API gagal
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
            name: "Budi Santoso",
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
            name: "Siti Nurhaliza",
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
  
  // Handler untuk membuka modal ubah status SP
  const handleOpenWarningModal = (employee: Employee) => {
    setSelectedEmployee(employee);
    setWarningModalOpen(true);
  };
  
  // Handler untuk membuka modal ubah shift
  const handleOpenShiftModal = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShiftModalOpen(true);
  };
  
  // Handler untuk membuka modal hapus karyawan
  const handleOpenDeleteModal = (employee: Employee) => {
    setSelectedEmployee(employee);
    setDeleteModalOpen(true);
  };
  
  // Handler untuk melihat detail karyawan
  const handleViewEmployeeDetail = (employeeId: string) => {
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
        try {
          const errorData = await response.json();
          console.error('Error response:', errorData);
          if (errorData.error) {
            errorMessage = errorData.error;
          }
          if (errorData.details) {
            console.error('Validation errors:', errorData.details);
          }
        } catch (e) {
          console.error('Error parsing error response:', e);
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
      
      // 1. Update status SP pada data karyawan
      const statusResponse = await fetch(`/api/employees/${employeeId}/warning-status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          warningStatus: data.warningStatus,
        }),
      });
      
      if (!statusResponse.ok) {
        const errorData = await statusResponse.json();
        throw new Error(errorData.message || 'Gagal mengubah status SP');
      }
      
      console.log("Status SP berhasil diubah, sekarang menambahkan ke riwayat");
      
      // 2. Tambahkan ke riwayat SP
      const historyResponse = await fetch(`/api/employees/${employeeId}/warning-history`, {
        method: 'POST',
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
      
      if (!historyResponse.ok) {
        const errorData = await historyResponse.json();
        throw new Error(errorData.message || 'Gagal menambahkan riwayat SP');
      }
      
      toast.success('Status SP berhasil diubah');
      fetchEmployees(); // Refresh data
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
          notes: data.notes
        }),
      });
      
      const responseData = await response.json();
      
      // Penanganan error yang lebih robust
      if (!response.ok) {
        let errorMessage = 'Gagal mengubah shift';
        
        if (responseData && responseData.error) {
          errorMessage = responseData.error;
        }
        
        throw new Error(errorMessage);
      }
      
      toast.success('Shift berhasil diubah');
      fetchEmployees(); // Refresh data
      setShiftModalOpen(false);
    } catch (error: unknown) {
      console.error('Error updating shift:', error);
      const errorMessage = error instanceof Error ? error.message : 'Gagal mengubah shift';
      toast.error(errorMessage);
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
            
            <Button variant="outline">
              <FileDown className="mr-2 h-4 w-4" />
              Export
            </Button>
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
                    <TableHead>ID</TableHead>
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
                  {filteredEmployees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        Tidak ada data karyawan yang ditemukan
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEmployees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell>{employee.employeeId}</TableCell>
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
          subDepartmentId={selectedEmployee.subDepartmentId || ""}
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
    </div>
  );
} 