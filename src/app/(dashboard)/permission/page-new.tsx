"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { 
  Search, 
  PlusCircle,
  CheckCircle2,
  XCircle,
  Filter,
  Calendar,
  User,
  Clock,
  FileText
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Interface untuk permission data
interface EmployeePermission {
  id: string;
  employee: {
    id: string;
    employeeId: string;
    name: string;
    email: string;
    department: string;
    subDepartment?: string;
    position: string;
  };
  type: string;
  typeLabel: string;
  startDate: string;
  endDate: string;
  duration: number;
  reason: string;
  otherDetails?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  statusLabel: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  createdAt: string;
}

// Interface untuk employee data
interface Employee {
  id: string;
  employeeId: string;
  name: string;
  department?: {
    id: string;
    name: string;
  };
  position?: {
    name: string;
  };
}

// Format tanggal
const formatDate = (dateString: string) => {
  return format(new Date(dateString), "d MMMM yyyy", { locale: id });
};

// Format tanggal dan waktu
const formatDateTime = (dateString: string) => {
  return format(new Date(dateString), "d MMM yyyy, HH:mm", { locale: id });
};

export default function EmployeePermissionPage() {
  const [activeTab, setActiveTab] = useState("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterType, setFilterType] = useState("ALL");
  const [permissions, setPermissions] = useState<EmployeePermission[]>([]);
  const [filteredPermissions, setFilteredPermissions] = useState<EmployeePermission[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Dialog states
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState<EmployeePermission | null>(null);
  
  // Form states
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [permissionType, setPermissionType] = useState("VACATION");
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [reason, setReason] = useState("");
  const [otherDetails, setOtherDetails] = useState("");
  const [approverName, setApproverName] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  
  // Error handling
  const [error, setError] = useState<string | null>(null);
  
  // Fetch data izin dan cuti karyawan
  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch('/api/employee-permissions', {
          cache: "no-store"
        });
        
        if (!response.ok) {
          throw new Error(`Error ${response.status}: Gagal mengambil data izin dan cuti`);
        }
        
        const result = await response.json();
        
        if (result.success) {
          setPermissions(result.data);
          setFilteredPermissions(result.data);
        } else {
          throw new Error(result.error || 'Gagal mengambil data');
        }
      } catch (fetchError) {
        console.error("Error fetching permissions:", fetchError);
        setError(fetchError instanceof Error ? fetchError.message : "Terjadi kesalahan");
        toast.error("Gagal mengambil data izin dan cuti");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPermissions();
  }, []);
  
  // Fetch data karyawan
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await fetch('/api/employees-public', {
          cache: "no-store"
        });
        
        if (response.ok) {
          const result = await response.json();
          setEmployees(result.employees || []);
        } else {
          console.error("Failed to fetch employees");
        }
      } catch (error) {
        console.error("Error fetching employees:", error);
      }
    };
    
    fetchEmployees();
  }, []);
  
  // Filter permissions
  useEffect(() => {
    let filtered = permissions;
    
    // Filter by search term (employee name)
    if (searchTerm) {
      filtered = filtered.filter(permission =>
        permission.employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        permission.employee.employeeId.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filter by status
    if (filterStatus !== "ALL") {
      filtered = filtered.filter(permission => permission.status === filterStatus);
    }
    
    // Filter by type
    if (filterType !== "ALL") {
      filtered = filtered.filter(permission => permission.type === filterType);
    }
    
    setFilteredPermissions(filtered);
  }, [permissions, searchTerm, filterStatus, filterType]);
  
  // Reset form
  const resetForm = () => {
    setSelectedEmployee("");
    setPermissionType("VACATION");
    setStartDate(format(new Date(), "yyyy-MM-dd"));
    setEndDate(format(new Date(), "yyyy-MM-dd"));
    setReason("");
    setOtherDetails("");
    setApproverName("");
    setRejectionReason("");
  };
  
  // Submit new permission
  const handleSubmitPermission = async () => {
    if (!selectedEmployee || !reason.trim()) {
      toast.error("Harap lengkapi semua field yang wajib diisi");
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const response = await fetch('/api/employee-permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeId: selectedEmployee,
          type: permissionType,
          startDate,
          endDate,
          reason,
          otherDetails: otherDetails || undefined
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success(result.message);
        setPermissions(prev => [result.data, ...prev]);
        setIsSubmitDialogOpen(false);
        resetForm();
      } else {
        toast.error(result.error || "Gagal mengajukan izin/cuti");
      }
    } catch (error) {
      console.error("Error submitting permission:", error);
      toast.error("Terjadi kesalahan saat mengajukan izin/cuti");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Approve permission
  const handleApprovePermission = async () => {
    if (!selectedPermission || !approverName.trim()) {
      toast.error("Nama penyetuju harus diisi");
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const response = await fetch(`/api/employee-permissions/${selectedPermission.id}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          approvedBy: approverName
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success(result.message);
        setPermissions(prev => 
          prev.map(p => p.id === selectedPermission.id ? {
            ...p,
            status: 'APPROVED' as const,
            statusLabel: 'Disetujui',
            approvedBy: approverName,
            approvedAt: new Date().toISOString()
          } : p)
        );
        setIsApproveDialogOpen(false);
        setApproverName("");
      } else {
        toast.error(result.error || "Gagal menyetujui izin/cuti");
      }
    } catch (error) {
      console.error("Error approving permission:", error);
      toast.error("Terjadi kesalahan saat menyetujui izin/cuti");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Reject permission
  const handleRejectPermission = async () => {
    if (!selectedPermission || !approverName.trim() || !rejectionReason.trim()) {
      toast.error("Nama penolak dan alasan penolakan harus diisi");
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const response = await fetch(`/api/employee-permissions/${selectedPermission.id}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rejectedBy: approverName,
          rejectionReason
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success(result.message);
        setPermissions(prev => 
          prev.map(p => p.id === selectedPermission.id ? {
            ...p,
            status: 'REJECTED' as const,
            statusLabel: 'Ditolak',
            approvedBy: approverName,
            rejectionReason,
            approvedAt: new Date().toISOString()
          } : p)
        );
        setIsRejectDialogOpen(false);
        setApproverName("");
        setRejectionReason("");
      } else {
        toast.error(result.error || "Gagal menolak izin/cuti");
      }
    } catch (error) {
      console.error("Error rejecting permission:", error);
      toast.error("Terjadi kesalahan saat menolak izin/cuti");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'secondary';
      case 'APPROVED':
        return 'default';
      case 'REJECTED':
        return 'destructive';
      default:
        return 'outline';
    }
  };
  
  // Get type badge variant
  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'SICK':
        return 'destructive';
      case 'VACATION':
        return 'default';
      case 'PERSONAL':
        return 'secondary';
      case 'OTHER':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kelola Izin & Cuti</h1>
          <p className="text-muted-foreground">
            Lihat dan kelola semua izin yang telah diajukan
          </p>
        </div>
        
        <Dialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              resetForm();
              setIsSubmitDialogOpen(true);
            }}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Ajukan Izin
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Ajukan Izin/Cuti Karyawan</DialogTitle>
              <DialogDescription>
                Isi form berikut untuk mengajukan izin atau cuti untuk karyawan
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="employee">Karyawan *</Label>
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih karyawan" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.name} ({employee.employeeId}) - {employee.department?.name || 'Tidak Ada Departemen'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="type">Tipe Izin *</Label>
                <Select value={permissionType} onValueChange={setPermissionType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SICK">Sakit</SelectItem>
                    <SelectItem value="VACATION">Cuti</SelectItem>
                    <SelectItem value="PERSONAL">Keperluan Pribadi</SelectItem>
                    <SelectItem value="OTHER">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="startDate">Tanggal Mulai *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="endDate">Tanggal Selesai *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="reason">Alasan *</Label>
                <Textarea
                  id="reason"
                  placeholder="Masukkan alasan izin/cuti..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="otherDetails">Keterangan Tambahan</Label>
                <Textarea
                  id="otherDetails"
                  placeholder="Informasi tambahan (opsional)"
                  value={otherDetails}
                  onChange={(e) => setOtherDetails(e.target.value)}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsSubmitDialogOpen(false)}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button onClick={handleSubmitPermission} disabled={isSubmitting}>
                {isSubmitting ? "Mengajukan..." : "Ajukan Izin"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">Daftar Izin</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filter & Pencarian
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4 md:flex-row">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Cari berdasarkan nama atau ID karyawan..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua Status</SelectItem>
                    <SelectItem value="PENDING">Menunggu</SelectItem>
                    <SelectItem value="APPROVED">Disetujui</SelectItem>
                    <SelectItem value="REJECTED">Ditolak</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Jenis" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua Jenis</SelectItem>
                    <SelectItem value="SICK">Sakit</SelectItem>
                    <SelectItem value="VACATION">Cuti</SelectItem>
                    <SelectItem value="PERSONAL">Keperluan Pribadi</SelectItem>
                    <SelectItem value="OTHER">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Data Table */}
          <Card>
            <CardHeader>
              <CardTitle>Daftar Semua Izin</CardTitle>
              <CardDescription>
                Lihat dan kelola semua izin yang telah diajukan
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-sm text-muted-foreground">Memuat data...</p>
                  </div>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <XCircle className="h-8 w-8 text-destructive mx-auto" />
                    <p className="mt-2 text-sm text-destructive">{error}</p>
                  </div>
                </div>
              ) : filteredPermissions.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <FileText className="h-8 w-8 text-muted-foreground mx-auto" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      {permissions.length === 0 ? "Tidak ada token autentikasi. Silakan login ulang." : "Tidak ada data yang sesuai dengan filter"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Karyawan</TableHead>
                        <TableHead>Departemen</TableHead>
                        <TableHead>Jenis</TableHead>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Durasi</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Diajukan</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPermissions.map((permission) => (
                        <TableRow key={permission.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{permission.employee.name}</div>
                              <div className="text-sm text-muted-foreground">
                                ID: {permission.employee.employeeId}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {permission.employee.department}
                              <br />
                              <span className="text-muted-foreground">
                                {permission.employee.position}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getTypeBadgeVariant(permission.type)}>
                              {permission.typeLabel}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {formatDate(permission.startDate)}
                              <br />
                              <span className="text-muted-foreground">
                                s/d {formatDate(permission.endDate)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              {permission.duration} hari
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(permission.status)}>
                              {permission.statusLabel}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-muted-foreground">
                              {formatDateTime(permission.createdAt)}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedPermission(permission);
                                  setIsDetailDialogOpen(true);
                                }}
                              >
                                Detail
                              </Button>
                              {permission.status === 'PENDING' && (
                                <>
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedPermission(permission);
                                      setApproverName("");
                                      setIsApproveDialogOpen(true);
                                    }}
                                  >
                                    <CheckCircle2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedPermission(permission);
                                      setApproverName("");
                                      setRejectionReason("");
                                      setIsRejectDialogOpen(true);
                                    }}
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
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
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Detail Izin/Cuti</DialogTitle>
          </DialogHeader>
          {selectedPermission && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Karyawan</Label>
                  <p className="mt-1">{selectedPermission.employee.name}</p>
                  <p className="text-sm text-muted-foreground">ID: {selectedPermission.employee.employeeId}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Departemen</Label>
                  <p className="mt-1">{selectedPermission.employee.department}</p>
                  <p className="text-sm text-muted-foreground">{selectedPermission.employee.position}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Jenis Izin</Label>
                  <p className="mt-1">
                    <Badge variant={getTypeBadgeVariant(selectedPermission.type)}>
                      {selectedPermission.typeLabel}
                    </Badge>
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <p className="mt-1">
                    <Badge variant={getStatusBadgeVariant(selectedPermission.status)}>
                      {selectedPermission.statusLabel}
                    </Badge>
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Tanggal Mulai</Label>
                  <p className="mt-1">{formatDate(selectedPermission.startDate)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Tanggal Selesai</Label>
                  <p className="mt-1">{formatDate(selectedPermission.endDate)}</p>
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Durasi</Label>
                <p className="mt-1 flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {selectedPermission.duration} hari
                </p>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Alasan</Label>
                <p className="mt-1">{selectedPermission.reason}</p>
              </div>
              
              {selectedPermission.otherDetails && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Keterangan Tambahan</Label>
                  <p className="mt-1">{selectedPermission.otherDetails}</p>
                </div>
              )}
              
              {selectedPermission.approvedBy && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    {selectedPermission.status === 'APPROVED' ? 'Disetujui oleh' : 'Ditolak oleh'}
                  </Label>
                  <p className="mt-1">{selectedPermission.approvedBy}</p>
                  {selectedPermission.approvedAt && (
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(selectedPermission.approvedAt)}
                    </p>
                  )}
                </div>
              )}
              
              {selectedPermission.rejectionReason && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Alasan Penolakan</Label>
                  <p className="mt-1 text-destructive">{selectedPermission.rejectionReason}</p>
                </div>
              )}
              
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Diajukan pada</Label>
                <p className="mt-1">{formatDateTime(selectedPermission.createdAt)}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Setujui Izin/Cuti</DialogTitle>
            <DialogDescription>
              Konfirmasi persetujuan izin/cuti untuk {selectedPermission?.employee.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="approverName">Nama Penyetuju *</Label>
              <Input
                id="approverName"
                value={approverName}
                onChange={(e) => setApproverName(e.target.value)}
                placeholder="Masukkan nama penyetuju"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsApproveDialogOpen(false)}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button onClick={handleApprovePermission} disabled={isSubmitting}>
              {isSubmitting ? "Memproses..." : "Setujui"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tolak Izin/Cuti</DialogTitle>
            <DialogDescription>
              Tolak izin/cuti untuk {selectedPermission?.employee.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="rejectorName">Nama Penolak *</Label>
              <Input
                id="rejectorName"
                value={approverName}
                onChange={(e) => setApproverName(e.target.value)}
                placeholder="Masukkan nama penolak"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rejectionReason">Alasan Penolakan *</Label>
              <Textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Masukkan alasan penolakan"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRejectDialogOpen(false)}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button 
              variant="destructive"
              onClick={handleRejectPermission} 
              disabled={isSubmitting}
            >
              {isSubmitting ? "Memproses..." : "Tolak"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
