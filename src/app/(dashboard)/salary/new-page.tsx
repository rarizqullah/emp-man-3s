"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { 
  Search, 
  FileDown, 
  Calendar as CalendarIcon, 
  PlusCircle,
  DollarSign,
  FileCheck,
  Loader2,
  RefreshCw,
  TrendingUp,
  Users,
  Building2,
  Clock
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

// Interface untuk data gaji dari API
interface Salary {
  id: string;
  employeeId: string;
  periodStart: string;
  periodEnd: string;
  mainWorkHours: number;
  regularOvertimeHours: number;
  weeklyOvertimeHours: number;
  baseSalary: number;
  overtimeSalary: number;
  weeklyOvertimeSalary: number;
  totalAllowances: number;
  totalSalary: number;
  paymentStatus: 'PAID' | 'UNPAID';
  createdAt: string;
  updatedAt: string;
  employee: {
    employeeId: string;
    user: {
      name: string;
      email: string;
    };
    department: {
      id: string;
      name: string;
    };
    position: {
      id: string;
      name: string;
    } | null;
    contractType: 'PERMANENT' | 'TRAINING';
    employeeAllowances?: Array<{
      allowanceValue: {
        allowanceType: {
          name: string;
        };
        value: number;
      };
    }>;
  };
}

// Interface untuk departemen
interface Department {
  id: string;
  name: string;
}

// Interface untuk statistik
interface SalaryStatistics {
  totalEmployees: number;
  totalSalaryAmount: number;
  paidSalaries: number;
  unpaidSalaries: number;
  departmentBreakdown: Record<string, {
    count: number;
    totalAmount: number;
    avgSalary: number;
  }>;
}

// Format mata uang ke Rupiah
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Format tanggal
const formatDate = (dateString: string | null) => {
  if (!dateString) return "-";
  return format(new Date(dateString), "d MMMM yyyy", { locale: id });
};

export default function SalaryPageNew() {
  // State management
  const [activeTab, setActiveTab] = useState("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterDepartment, setFilterDepartment] = useState("");
  const [filterPaymentStatus, setFilterPaymentStatus] = useState("");
  
  // Data state
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [statistics, setStatistics] = useState<SalaryStatistics | null>(null);
  const [selectedSalaries, setSelectedSalaries] = useState<string[]>([]);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // Modal states
  const [isGeneratingOpen, setIsGeneratingOpen] = useState(false);
  const [isProcessingOpen, setIsProcessingOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedSalary, setSelectedSalary] = useState<Salary | null>(null);
  
  // Form states untuk generate salary
  const [generateForm, setGenerateForm] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    departmentId: "",
    includeAttendance: true,
    includeOvertime: true,
    includeAllowances: true
  });

  // Form states untuk payment processing
  const [paymentForm, setPaymentForm] = useState({
    paymentDate: new Date(),
    paymentMethod: "TRANSFER",
    notes: ""
  });

  // Fetch departments
  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/departments');
      if (response.ok) {
        const data = await response.json();
        setDepartments(data);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  // Fetch salaries dengan filter
  const fetchSalaries = async () => {
    try {
      setIsLoading(true);
      
      const params = new URLSearchParams();
      
      if (filterDepartment && filterDepartment !== "ALL") {
        params.append('departmentId', filterDepartment);
      }
      
      if (filterPaymentStatus && filterPaymentStatus !== "ALL") {
        params.append('paymentStatus', filterPaymentStatus);
      }
      
      // Filter berdasarkan periode bulan/tahun
      if (filterMonth && filterYear) {
        const startDate = new Date(filterYear, filterMonth - 1, 1).toISOString();
        const endDate = new Date(filterYear, filterMonth, 0).toISOString();
        params.append('startDate', startDate);
        params.append('endDate', endDate);
      }
      
      const response = await fetch(`/api/salaries?${params}`);
      
      if (response.ok) {
        const result = await response.json();
        setSalaries(result.data || []);
      } else {
        toast.error('Gagal memuat data gaji');
      }
    } catch (error) {
      console.error('Error fetching salaries:', error);
      toast.error('Terjadi kesalahan saat memuat data');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch statistics
  const fetchStatistics = async () => {
    try {
      const params = new URLSearchParams({
        stats: 'true'
      });
      
      if (filterMonth && filterYear) {
        const startDate = new Date(filterYear, filterMonth - 1, 1).toISOString();
        const endDate = new Date(filterYear, filterMonth, 0).toISOString();
        params.append('startDate', startDate);
        params.append('endDate', endDate);
      }
      
      const response = await fetch(`/api/salaries?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        setStatistics(data);
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  // Generate gaji untuk periode tertentu
  const handleGenerateSalaries = async () => {
    try {
      setIsGenerating(true);
      
      const response = await fetch('/api/salaries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          year: generateForm.year,
          month: generateForm.month,
          departmentId: generateForm.departmentId || undefined,
          basis: 'MONTHLY'
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        toast.success(result.message);
        setIsGeneratingOpen(false);
        fetchSalaries(); // Refresh data
        fetchStatistics(); // Refresh statistik
      } else {
        const error = await response.json();
        toast.error(error.error || 'Gagal menghitung gaji');
      }
    } catch (error) {
      console.error('Error generating salaries:', error);
      toast.error('Terjadi kesalahan saat menghitung gaji');
    } finally {
      setIsGenerating(false);
    }
  };

  // Proses pembayaran massal
  const handleProcessPayments = async () => {
    if (selectedSalaries.length === 0) {
      toast.error('Pilih minimal satu gaji untuk diproses');
      return;
    }

    try {
      setIsProcessingPayment(true);
      
      const response = await fetch('/api/salaries/process-payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          salaryIds: selectedSalaries,
          paymentDate: paymentForm.paymentDate.toISOString(),
          paymentMethod: paymentForm.paymentMethod,
          notes: paymentForm.notes
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        toast.success(result.message);
        setIsProcessingOpen(false);
        setSelectedSalaries([]);
        fetchSalaries(); // Refresh data
        fetchStatistics(); // Refresh statistik
      } else {
        const error = await response.json();
        toast.error(error.error || 'Gagal memproses pembayaran');
      }
    } catch (error) {
      console.error('Error processing payments:', error);
      toast.error('Terjadi kesalahan saat memproses pembayaran');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Export data
  const handleExportData = async (format: 'excel' | 'csv' = 'excel') => {
    try {
      setIsExporting(true);
      
      const params = new URLSearchParams({ export: format });
      
      if (filterDepartment && filterDepartment !== "ALL") {
        params.append('departmentId', filterDepartment);
      }
      
      if (filterPaymentStatus && filterPaymentStatus !== "ALL") {
        params.append('paymentStatus', filterPaymentStatus);
      }
      
      if (filterMonth && filterYear) {
        const startDate = new Date(filterYear, filterMonth - 1, 1).toISOString();
        const endDate = new Date(filterYear, filterMonth, 0).toISOString();
        params.append('startDate', startDate);
        params.append('endDate', endDate);
      }
      
      const response = await fetch(`/api/salaries?${params}`);
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.type === 'export') {
          // Download file
          const blob = new Blob([JSON.stringify(result.data, null, 2)], {
            type: format === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv'
          });
          
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = url;
          a.download = result.filename;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          
          toast.success(`Data berhasil diekspor sebagai ${format.toUpperCase()}`);
        }
      } else {
        toast.error('Gagal mengekspor data');
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Terjadi kesalahan saat mengekspor data');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle checkbox selection
  const handleSelectSalary = (salaryId: string, checked: boolean) => {
    if (checked) {
      setSelectedSalaries(prev => [...prev, salaryId]);
    } else {
      setSelectedSalaries(prev => prev.filter(id => id !== salaryId));
    }
  };

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const unpaidSalaryIds = filteredSalaries
        .filter(salary => salary.paymentStatus === 'UNPAID')
        .map(salary => salary.id);
      setSelectedSalaries(unpaidSalaryIds);
    } else {
      setSelectedSalaries([]);
    }
  };

  // Filter salaries berdasarkan search term
  const filteredSalaries = salaries.filter((salary) => {
    const matchesSearch = searchTerm === "" || 
      salary.employee.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      salary.employee.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  // Auto-refresh setiap 5 menit untuk data terkini
  useEffect(() => {
    const interval = setInterval(() => {
      fetchSalaries();
      fetchStatistics();
    }, 5 * 60 * 1000); // 5 menit

    return () => clearInterval(interval);
  }, [filterDepartment, filterPaymentStatus, filterMonth, filterYear]);

  // Initial data fetch
  useEffect(() => {
    fetchDepartments();
    fetchSalaries();
    fetchStatistics();
  }, []);

  // Re-fetch when filters change
  useEffect(() => {
    fetchSalaries();
    fetchStatistics();
  }, [filterDepartment, filterPaymentStatus, filterMonth, filterYear]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Manajemen Penggajian</h1>
          <p className="text-muted-foreground">
            Kelola perhitungan dan pembayaran gaji karyawan
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setIsProcessingOpen(true)}
            disabled={selectedSalaries.length === 0}
          >
            <DollarSign className="mr-2 h-4 w-4" />
            Proses Pembayaran ({selectedSalaries.length})
          </Button>
          <Button onClick={() => setIsGeneratingOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Hitung Gaji
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Karyawan</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.totalEmployees}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Gaji</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(statistics.totalSalaryAmount)}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sudah Dibayar</CardTitle>
              <FileCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{statistics.paidSalaries}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Belum Dibayar</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{statistics.unpaidSalaries}</div>
            </CardContent>
          </Card>
        </div>
      )}
      
      <Tabs defaultValue="list" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="list">Daftar Gaji</TabsTrigger>
          <TabsTrigger value="configuration">Konfigurasi</TabsTrigger>
        </TabsList>
        
        <TabsContent value="list" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Data Gaji Karyawan</CardTitle>
              <CardDescription>
                Kelola perhitungan dan pembayaran gaji karyawan dengan sistem terintegrasi
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-col md:flex-row justify-between mb-4 gap-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 flex-1">
                  <div className="relative w-full max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Cari nama atau ID karyawan..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Select value={String(filterMonth)} onValueChange={(value) => setFilterMonth(Number(value))}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Bulan" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => (
                          <SelectItem key={i + 1} value={String(i + 1)}>
                            {format(new Date(2024, i, 1), 'MMMM', { locale: id })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Select value={String(filterYear)} onValueChange={(value) => setFilterYear(Number(value))}>
                      <SelectTrigger className="w-[100px]">
                        <SelectValue placeholder="Tahun" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 5 }, (_, i) => {
                          const year = new Date().getFullYear() - 2 + i;
                          return (
                            <SelectItem key={year} value={String(year)}>
                              {year}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    
                    <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Departemen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Semua Departemen</SelectItem>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Select value={filterPaymentStatus} onValueChange={setFilterPaymentStatus}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Semua Status</SelectItem>
                        <SelectItem value="PAID">Sudah Dibayar</SelectItem>
                        <SelectItem value="UNPAID">Belum Dibayar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => fetchSalaries()}
                    disabled={isLoading}
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => handleExportData('excel')}
                    disabled={isExporting}
                  >
                    {isExporting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <FileDown className="mr-2 h-4 w-4" />
                    )}
                    Export Excel
                  </Button>
                </div>
              </div>
              
              {/* Data Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={selectedSalaries.length === filteredSalaries.filter(s => s.paymentStatus === 'UNPAID').length && filteredSalaries.filter(s => s.paymentStatus === 'UNPAID').length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>ID Karyawan</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead>Departemen</TableHead>
                      <TableHead>Periode</TableHead>
                      <TableHead className="text-right">Jam Kerja</TableHead>
                      <TableHead className="text-right">Gaji Pokok</TableHead>
                      <TableHead className="text-right">Lembur</TableHead>
                      <TableHead className="text-right">Tunjangan</TableHead>
                      <TableHead className="text-right">Total Gaji</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={12} className="text-center h-24">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                          <p className="mt-2">Memuat data gaji...</p>
                        </TableCell>
                      </TableRow>
                    ) : filteredSalaries.length > 0 ? (
                      filteredSalaries.map((salary) => (
                        <TableRow key={salary.id}>
                          <TableCell>
                            {salary.paymentStatus === 'UNPAID' && (
                              <Checkbox
                                checked={selectedSalaries.includes(salary.id)}
                                onCheckedChange={(checked) => handleSelectSalary(salary.id, !!checked)}
                              />
                            )}
                          </TableCell>
                          <TableCell>{salary.employee.employeeId}</TableCell>
                          <TableCell className="font-medium">{salary.employee.user.name}</TableCell>
                          <TableCell>{salary.employee.department.name}</TableCell>
                          <TableCell>{format(new Date(salary.periodStart), 'MMM yyyy', { locale: id })}</TableCell>
                          <TableCell className="text-right">
                            {(salary.mainWorkHours + salary.regularOvertimeHours + salary.weeklyOvertimeHours).toFixed(1)} jam
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(salary.baseSalary)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(salary.overtimeSalary + salary.weeklyOvertimeSalary)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(salary.totalAllowances)}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(salary.totalSalary)}</TableCell>
                          <TableCell>
                            <Badge variant={salary.paymentStatus === "PAID" ? "default" : "secondary"}>
                              {salary.paymentStatus === "PAID" ? "Dibayar" : "Belum Dibayar"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => {
                                setSelectedSalary(salary);
                                setIsDetailOpen(true);
                              }}
                            >
                              <FileCheck className="h-4 w-4" />
                              <span className="sr-only">Detail</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={12} className="text-center h-24">
                          Tidak ada data gaji ditemukan
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Configuration */}
        <TabsContent value="configuration" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Konfigurasi Penggajian</CardTitle>
              <CardDescription>
                Pengaturan tarif gaji, tunjangan, dan aturan perhitungan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Konfigurasi tarif gaji dan tunjangan dapat diatur melalui menu Konfigurasi.
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => window.location.href = '/configuration/salary-rates'}>
                    <Building2 className="mr-2 h-4 w-4" />
                    Kelola Tarif Gaji
                  </Button>
                  <Button variant="outline" onClick={() => window.location.href = '/configuration/allowances'}>
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Kelola Tunjangan
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog untuk detail slip gaji */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Detail Slip Gaji</DialogTitle>
            <DialogDescription>
              {selectedSalary && `${selectedSalary.employee.user.name} - ${format(new Date(selectedSalary.periodStart), 'MMMM yyyy', { locale: id })}`}
            </DialogDescription>
          </DialogHeader>
          
          {selectedSalary && (
            <div className="space-y-6">
              <div className="flex justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">ID Karyawan</p>
                  <p className="font-medium">{selectedSalary.employee.employeeId}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Departemen</p>
                  <p className="font-medium">{selectedSalary.employee.department.name}</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium">Jam Kerja</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center p-2 bg-muted rounded">
                    <p className="text-muted-foreground">Jam Utama</p>
                    <p className="font-medium">{selectedSalary.mainWorkHours.toFixed(1)} jam</p>
                  </div>
                  <div className="text-center p-2 bg-muted rounded">
                    <p className="text-muted-foreground">Lembur Reguler</p>
                    <p className="font-medium">{selectedSalary.regularOvertimeHours.toFixed(1)} jam</p>
                  </div>
                  <div className="text-center p-2 bg-muted rounded">
                    <p className="text-muted-foreground">Lembur Mingguan</p>
                    <p className="font-medium">{selectedSalary.weeklyOvertimeHours.toFixed(1)} jam</p>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b">
                <p className="font-medium">Pendapatan</p>
                <p className="font-medium">Jumlah</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <p>Gaji Pokok</p>
                  <p className="text-right">{formatCurrency(selectedSalary.baseSalary)}</p>
                </div>
                <div className="flex justify-between">
                  <p>Gaji Lembur Reguler</p>
                  <p className="text-right">{formatCurrency(selectedSalary.overtimeSalary)}</p>
                </div>
                <div className="flex justify-between">
                  <p>Gaji Lembur Mingguan</p>
                  <p className="text-right">{formatCurrency(selectedSalary.weeklyOvertimeSalary)}</p>
                </div>
                <div className="flex justify-between">
                  <p>Total Tunjangan</p>
                  <p className="text-right">{formatCurrency(selectedSalary.totalAllowances)}</p>
                </div>
              </div>
              
              <div className="flex justify-between items-center py-2 border-t border-b">
                <p className="font-medium text-lg">Total Gaji</p>
                <p className="font-bold text-lg text-right">{formatCurrency(selectedSalary.totalSalary)}</p>
              </div>
              
              <div className="flex justify-between text-sm">
                <p className="text-muted-foreground">Status Pembayaran</p>
                <Badge variant={selectedSalary.paymentStatus === "PAID" ? "default" : "secondary"}>
                  {selectedSalary.paymentStatus === "PAID" ? "Dibayar" : "Belum Dibayar"}
                </Badge>
              </div>
              
              <div className="flex justify-between text-sm">
                <p className="text-muted-foreground">Tanggal Dihitung</p>
                <p>{formatDate(selectedSalary.createdAt)}</p>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>Tutup</Button>
            <Button>
              <FileDown className="mr-2 h-4 w-4" />
              Cetak Slip Gaji
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog untuk hitung gaji */}
      <Dialog open={isGeneratingOpen} onOpenChange={setIsGeneratingOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hitung Gaji Karyawan</DialogTitle>
            <DialogDescription>
              Hitung gaji berdasarkan data kehadiran dan konfigurasi tarif
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium mb-1 block">Bulan</label>
                <Select 
                  value={String(generateForm.month)} 
                  onValueChange={(value) => setGenerateForm(prev => ({ ...prev, month: Number(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>
                        {format(new Date(2024, i, 1), 'MMMM', { locale: id })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex-1">
                <label className="text-sm font-medium mb-1 block">Tahun</label>
                <Select 
                  value={String(generateForm.year)} 
                  onValueChange={(value) => setGenerateForm(prev => ({ ...prev, year: Number(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 5 }, (_, i) => {
                      const year = new Date().getFullYear() - 2 + i;
                      return (
                        <SelectItem key={year} value={String(year)}>
                          {year}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Departemen</label>
              <Select 
                value={generateForm.departmentId} 
                onValueChange={(value) => setGenerateForm(prev => ({ ...prev, departmentId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih departemen (kosongkan untuk semua)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Semua Departemen</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium mb-1 block">Opsi Perhitungan</label>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="includeAttendance" 
                  checked={generateForm.includeAttendance}
                  onCheckedChange={(checked) => setGenerateForm(prev => ({ ...prev, includeAttendance: !!checked }))}
                />
                <label htmlFor="includeAttendance" className="text-sm">Hitung berdasarkan data kehadiran</label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="includeOvertime" 
                  checked={generateForm.includeOvertime}
                  onCheckedChange={(checked) => setGenerateForm(prev => ({ ...prev, includeOvertime: !!checked }))}
                />
                <label htmlFor="includeOvertime" className="text-sm">Hitung jam lembur</label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="includeAllowances" 
                  checked={generateForm.includeAllowances}
                  onCheckedChange={(checked) => setGenerateForm(prev => ({ ...prev, includeAllowances: !!checked }))}
                />
                <label htmlFor="includeAllowances" className="text-sm">Hitung tunjangan karyawan</label>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGeneratingOpen(false)} disabled={isGenerating}>
              Batal
            </Button>
            <Button onClick={handleGenerateSalaries} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menghitung...
                </>
              ) : (
                <>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Hitung Gaji
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog untuk proses pembayaran */}
      <Dialog open={isProcessingOpen} onOpenChange={setIsProcessingOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Proses Pembayaran Gaji</DialogTitle>
            <DialogDescription>
              Proses pembayaran untuk {selectedSalaries.length} gaji yang dipilih
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Tanggal Pembayaran</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(paymentForm.paymentDate, "PPP", { locale: id })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={paymentForm.paymentDate}
                    onSelect={(date) => date && setPaymentForm(prev => ({ ...prev, paymentDate: date }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Metode Pembayaran</label>
              <Select 
                value={paymentForm.paymentMethod} 
                onValueChange={(value) => setPaymentForm(prev => ({ ...prev, paymentMethod: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRANSFER">Transfer Bank</SelectItem>
                  <SelectItem value="CASH">Tunai</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Catatan</label>
              <Input 
                placeholder="Catatan pembayaran (opsional)" 
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProcessingOpen(false)} disabled={isProcessingPayment}>
              Batal
            </Button>
            <Button onClick={handleProcessPayments} disabled={isProcessingPayment}>
              {isProcessingPayment ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <DollarSign className="mr-2 h-4 w-4" />
                  Proses Pembayaran
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 