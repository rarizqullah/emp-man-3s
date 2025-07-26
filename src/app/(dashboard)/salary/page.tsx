"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { 
  Search, 
  PlusCircle,
  Loader2,
  RefreshCw,
  Eye,
  CreditCard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { SalaryDatePicker } from "@/components/salary/salary-date-picker";
import { ExportMenu } from "@/components/salary/export-menu";
import { SalarySlipPDF } from "@/components/salary/salary-slip-pdf";

interface Department {
  id: string;
  name: string;
}

interface Allowance {
  id: string;
  name: string;
  companyAmount: number;
  employeeAmount: number;
}

interface EmployeeAllowance {
  id: string;
  isActive: boolean;
  allowance: Allowance;
}

interface Employee {
  employeeId: string;
  bankAccountNumber?: string | null;
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
  employeeAllowances?: EmployeeAllowance[];
}

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
  employee: Employee;
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

export default function SalaryPageUpdated() {
  // State untuk data
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  
  // State untuk loading
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // State untuk filter dan pencarian
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("ALL");
  const [filterPaymentStatus, setFilterPaymentStatus] = useState("ALL");
  
  // State untuk date range filter
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  
  // State untuk generate gaji dengan date picker
  const [generateStartDate, setGenerateStartDate] = useState<Date>();
  const [generateEndDate, setGenerateEndDate] = useState<Date>();
  
  // State untuk dialog
  const [isGeneratingOpen, setIsGeneratingOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedSalaryDetails, setSelectedSalaryDetails] = useState<Salary | null>(null);

  // Tambahkan useEffect untuk sinkronisasi periode saat dialog dibuka
  useEffect(() => {
    if (isGeneratingOpen) {
      // Sinkronkan periode generate dengan filter jika ada
      if (dateFrom && dateTo) {
        setGenerateStartDate(dateFrom);
        setGenerateEndDate(dateTo);
      } else {
        setGenerateStartDate(undefined);
        setGenerateEndDate(undefined);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGeneratingOpen]);

  // Fetch data salaries dengan filter
  const fetchSalaries = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      
      if (filterDepartment !== "ALL") {
        params.append('departmentId', filterDepartment);
      }
      
      if (filterPaymentStatus !== "ALL") {
        params.append('paymentStatus', filterPaymentStatus);
      }
      
      if (dateFrom && dateTo) {
        params.append('startDate', dateFrom.toISOString());
        params.append('endDate', dateTo.toISOString());
      }
      
      const url = params.toString() ? `/api/salaries?${params}` : '/api/salaries';
      const response = await fetch(url);
      
      if (response.ok) {
        const result = await response.json();
        setSalaries(result.data || []);
      } else {
        toast.error('Gagal memuat data gaji');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Gagal memuat data gaji');
    } finally {
      setIsLoading(false);
    }
  };

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

  // Generate gaji dengan date range picker
  const handleGenerateSalaries = async () => {
    console.log('Generate salaries clicked:', { generateStartDate, generateEndDate });
    
    if (!generateStartDate || !generateEndDate) {
      toast.error('Pilih periode terlebih dahulu untuk generate gaji');
      return;
    }

    try {
      setIsGenerating(true);
      
      console.log('Sending request to generate salaries with:', {
        startDate: generateStartDate.toISOString(),
        endDate: generateEndDate.toISOString(),
        departmentId: filterDepartment !== "ALL" ? filterDepartment : undefined
      });
      
      const response = await fetch('/api/salaries/generate-by-date', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: generateStartDate.toISOString(),
          endDate: generateEndDate.toISOString(),
          departmentId: filterDepartment !== "ALL" ? filterDepartment : undefined
        }),
      });
      
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('Generate result:', result);
        toast.success(result.message || 'Gaji berhasil dihitung');
        setIsGeneratingOpen(false);
        // Reset form
        setGenerateStartDate(undefined);
        setGenerateEndDate(undefined);
        // Update filter periode agar data langsung ter-refresh
        setDateFrom(generateStartDate);
        setDateTo(generateEndDate);
        // Refresh data
        fetchSalaries();
      } else {
        const error = await response.json();
        console.error('Generate error:', error);
        toast.error(error.error || 'Gagal menghitung gaji');
      }
    } catch (error) {
      console.error('Error generating salaries:', error);
      toast.error('Terjadi kesalahan saat menghitung gaji');
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle export data - Excel only
  const handleExport = async (format: 'excel') => {
    try {
      const params = new URLSearchParams();
      params.append('export', format);
      
      if (filterDepartment !== "ALL") {
        params.append('departmentId', filterDepartment);
      }
      
      if (filterPaymentStatus !== "ALL") {
        params.append('paymentStatus', filterPaymentStatus);
      }
      
      if (dateFrom && dateTo) {
        params.append('startDate', dateFrom.toISOString());
        params.append('endDate', dateTo.toISOString());
      }
      
      const response = await fetch(`/api/salaries?${params}`);
      const result = await response.json();
      
      if (result.type === 'export') {
        // Process Excel export on client side
        const { utils, writeFile } = await import('xlsx');
        const worksheet = utils.json_to_sheet(result.data);
        const workbook = utils.book_new();
        utils.book_append_sheet(workbook, worksheet, 'Data Gaji');
        writeFile(workbook, result.filename);
        
        toast.success('Data berhasil diekspor ke Excel');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Gagal mengekspor data ke Excel');
    }
  };

  // Handle view salary details
  const handleViewDetails = async (salary: Salary) => {
    try {
      setIsDetailsOpen(true);
      setSelectedSalaryDetails(null); // Clear previous data while loading
      
      // Fetch detailed salary data including allowances
      const response = await fetch(`/api/salaries/${salary.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch salary details');
      }
      
      const result = await response.json();
      if (result.success) {
        setSelectedSalaryDetails(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch salary details');
      }
    } catch (error) {
      console.error('Error fetching salary details:', error);
      toast.error('Gagal memuat detail gaji');
      setIsDetailsOpen(false);
    }
  };

  // Handle payment status update
  const handleUpdatePaymentStatus = async (salaryId: string, status: 'PAID' | 'UNPAID') => {
    try {
      const response = await fetch(`/api/salaries/${salaryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentStatus: status,
          paymentDate: status === 'PAID' ? new Date().toISOString() : undefined
        }),
      });
      
      if (response.ok) {
        toast.success('Status pembayaran berhasil diupdate');
        fetchSalaries(); // Refresh data
      } else {
        toast.error('Gagal mengupdate status pembayaran');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Terjadi kesalahan saat mengupdate status');
    }
  };

  // Handle date range filter change
  const handleDateRangeChange = (startDate: Date, endDate: Date) => {
    setDateFrom(startDate);
    setDateTo(endDate);
  };

  // Handle generate date range change
  const handleGenerateDateChange = (startDate: Date, endDate: Date) => {
    setGenerateStartDate(startDate);
    setGenerateEndDate(endDate);
  };

  // Filter salaries berdasarkan search term
  const filteredSalaries = salaries.filter((salary) => {
    const matchesSearch = searchTerm === "" || 
      salary.employee.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      salary.employee.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  // Initial data fetch
  useEffect(() => {
    fetchDepartments();
    fetchSalaries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto refresh saat filter berubah
  useEffect(() => {
    fetchSalaries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterDepartment, filterPaymentStatus, dateFrom, dateTo]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h1 className="typography-h1">Penggajian</h1>
          <p className="text-muted-foreground">
            Kelola data gaji dan pembayaran karyawan
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <Dialog open={isGeneratingOpen} onOpenChange={setIsGeneratingOpen}>
            <DialogTrigger asChild>
              <Button size="default" className="h-10 min-w-[140px]">
                <PlusCircle className="mr-2 h-4 w-4" />
                Hitung Gaji
              </Button>
            </DialogTrigger>
          </Dialog>
          
          <Button 
            onClick={fetchSalaries} 
            disabled={isLoading} 
            variant="outline" 
            size="default"
            className="h-10 min-w-[120px]"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="data" className="space-y-4">
        <TabsList>
          <TabsTrigger value="data">Data Gaji Karyawan</TabsTrigger>
          <TabsTrigger value="config">Konfigurasi</TabsTrigger>
        </TabsList>

        <TabsContent value="data" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Data Gaji Karyawan</CardTitle>
              <CardDescription>
                Daftar gaji karyawan dengan filter pencarian
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filter dan Pencarian */}
              <div className="flex flex-col gap-6 mb-6">
                {/* Row 1: Search, Department, Payment Status - Grid layout yang responsif */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Cari berdasarkan Nama/NIK</Label>
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Cari nama atau NIK karyawan..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 h-11"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Departemen</Label>
                    <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Semua Departemen" />
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
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Status Pembayaran</Label>
                    <Select value={filterPaymentStatus} onValueChange={setFilterPaymentStatus}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Semua Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Semua Status</SelectItem>
                        <SelectItem value="PAID">Sudah Dibayar</SelectItem>
                        <SelectItem value="UNPAID">Belum Dibayar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Row 2: Date Range Filter with Export Button - Layout yang simetris */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Filter Periode Gaji</Label>
                  <div className="flex flex-col sm:flex-row gap-2 sm:items-end sm:justify-start">
                    <div className="w-full sm:w-[200px]">
                      <SalaryDatePicker
                        startDate={dateFrom}
                        endDate={dateTo}
                        onDateChange={handleDateRangeChange}
                        placeholder="Pilih periode"
                        className="w-full"
                      />
                    </div>
                    
                    <div className="w-full sm:w-[140px]">
                      <ExportMenu 
                        onExport={handleExport} 
                        size="default"
                        variant="outline"
                        className="h-11 w-full"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Tabel Data Gaji */}
              <div className="rounded-md border overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[100px]">NIK</TableHead>
                        <TableHead className="min-w-[150px]">Nama</TableHead>
                        <TableHead className="min-w-[120px]">Departemen</TableHead>
                        <TableHead className="min-w-[150px]">Periode</TableHead>
                        <TableHead className="text-right min-w-[120px]">Total Gaji</TableHead>
                        <TableHead className="min-w-[100px]">Status</TableHead>
                        <TableHead className="text-right min-w-[140px]">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center h-24">
                            <div className="flex flex-col items-center justify-center">
                              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                              <p className="text-sm text-muted-foreground">Memuat data gaji...</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : filteredSalaries.length > 0 ? (
                        filteredSalaries.map((salary) => (
                          <TableRow key={salary.id} className="hover:bg-muted/50">
                            <TableCell className="font-medium font-mono text-sm">{salary.employee.employeeId}</TableCell>
                            <TableCell className="font-medium">{salary.employee.user.name}</TableCell>
                            <TableCell className="text-sm">{salary.employee.department.name}</TableCell>
                            <TableCell className="text-sm">
                              {format(new Date(salary.periodStart), 'dd MMM', { locale: id })} - {format(new Date(salary.periodEnd), 'dd MMM yyyy', { locale: id })}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(salary.totalSalary)}
                            </TableCell>
                            <TableCell>
                              <Badge variant={salary.paymentStatus === 'PAID' ? 'default' : 'destructive'} className="text-xs">
                                {salary.paymentStatus === 'PAID' ? 'Dibayar' : 'Belum Dibayar'}
                              </Badge>
                            </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewDetails(salary)}
                                className="h-8 px-2"
                              >
                                <Eye className="h-4 w-4" />
                                <span className="ml-1 hidden sm:inline">Detail</span>
                              </Button>
                              
                              <SalarySlipPDF 
                                salaryId={salary.id}
                                variant="ghost"
                                size="sm"
                              />
                              
                              {salary.paymentStatus === 'UNPAID' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleUpdatePaymentStatus(salary.id, 'PAID')}
                                  className="h-8 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                                >
                                  <CreditCard className="h-4 w-4" />
                                  <span className="ml-1 hidden sm:inline">Bayar</span>
                                </Button>
                              )}
                            </div>
                          </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center h-24">
                            <div className="flex flex-col items-center justify-center">
                              <p className="text-muted-foreground">Tidak ada data gaji yang ditemukan</p>
                              <p className="text-sm text-muted-foreground mt-1">
                                Silakan ubah filter atau generate gaji terlebih dahulu
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>Konfigurasi Penggajian</CardTitle>
              <CardDescription>
                Pengaturan tarif gaji dan tunjangan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Konfigurasi tarif gaji dan tunjangan dapat diatur melalui menu Konfigurasi.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog Generate Gaji dengan Date Picker */}
      <Dialog open={isGeneratingOpen} onOpenChange={setIsGeneratingOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hitung Gaji Karyawan</DialogTitle>
            <DialogDescription>
              Hitung gaji berdasarkan data kehadiran untuk periode tertentu
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium">Periode Perhitungan Gaji</Label>
              <SalaryDatePicker
                startDate={generateStartDate}
                endDate={generateEndDate}
                onDateChange={handleGenerateDateChange}
                placeholder="Pilih periode"
              />
            </div>
            
            <div>
              <Label className="text-sm font-medium">Departemen (Opsional)</Label>
              <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih departemen" />
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
            </div>

            {/* Display selected period */}
            {generateStartDate && generateEndDate && (
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-2 w-2 bg-primary rounded-full"></div>
                  <span className="text-sm font-medium">Periode yang dipilih:</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {format(generateStartDate, 'dd MMMM yyyy', { locale: id })} 
                  {' - '}
                  {format(generateEndDate, 'dd MMMM yyyy', { locale: id })}
                </p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsGeneratingOpen(false)}
              disabled={isGenerating}
            >
              Batal
            </Button>
            <Button
              onClick={handleGenerateSalaries}
              disabled={isGenerating || !generateStartDate || !generateEndDate}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menghitung...
                </>
              ) : (
                'Hitung Gaji'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Detail Gaji */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detail Slip Gaji</DialogTitle>
            <DialogDescription>
              Rincian lengkap gaji karyawan
            </DialogDescription>
          </DialogHeader>
          
          {selectedSalaryDetails ? (
            <div className="space-y-4">
              {/* Data Karyawan */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <Label className="text-sm font-medium">NIK</Label>
                  <p className="text-sm">{selectedSalaryDetails.employee.employeeId}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Nama Karyawan</Label>
                  <p className="text-sm">{selectedSalaryDetails.employee.user.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Departemen</Label>
                  <p className="text-sm">{selectedSalaryDetails.employee.department.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Posisi</Label>
                  <p className="text-sm">{selectedSalaryDetails.employee.position?.name || '-'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">No. Rekening</Label>
                  <p className="text-sm">{selectedSalaryDetails.employee.bankAccountNumber || '-'}</p>
                </div>
              </div>

              {/* Periode Gaji */}
              <div className="p-4 bg-muted rounded-lg">
                <Label className="text-sm font-medium">Periode Gaji</Label>
                <p className="text-sm">
                  {format(new Date(selectedSalaryDetails.periodStart), 'dd MMMM yyyy', { locale: id })} - {format(new Date(selectedSalaryDetails.periodEnd), 'dd MMMM yyyy', { locale: id })}
                </p>
              </div>

              {/* Rekap Jam Kerja */}
              <div className="p-4 bg-muted rounded-lg">
                <Label className="text-sm font-medium mb-3 block">Rekap Jam Kerja</Label>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">Jam Kerja Utama</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedSalaryDetails.mainWorkHours} jam × {selectedSalaryDetails.mainWorkHours > 0 ? formatCurrency(Math.round(selectedSalaryDetails.baseSalary / selectedSalaryDetails.mainWorkHours)) : formatCurrency(0)}/jam
                      </p>
                    </div>
                    <span className="font-medium">{formatCurrency(selectedSalaryDetails.baseSalary)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">Lembur Reguler</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedSalaryDetails.regularOvertimeHours} jam × {selectedSalaryDetails.regularOvertimeHours > 0 ? formatCurrency(Math.round(selectedSalaryDetails.overtimeSalary / selectedSalaryDetails.regularOvertimeHours)) : formatCurrency(0)}/jam
                      </p>
                    </div>
                    <span className="font-medium">{formatCurrency(selectedSalaryDetails.overtimeSalary)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">Lembur Mingguan</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedSalaryDetails.weeklyOvertimeHours} jam × {selectedSalaryDetails.weeklyOvertimeHours > 0 ? formatCurrency(Math.round(selectedSalaryDetails.weeklyOvertimeSalary / selectedSalaryDetails.weeklyOvertimeHours)) : formatCurrency(0)}/jam
                      </p>
                    </div>
                    <span className="font-medium">{formatCurrency(selectedSalaryDetails.weeklyOvertimeSalary)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-medium">
                    <span>Total Jam Kerja: {selectedSalaryDetails.mainWorkHours + selectedSalaryDetails.regularOvertimeHours + selectedSalaryDetails.weeklyOvertimeHours} jam</span>
                    <span>{formatCurrency(selectedSalaryDetails.baseSalary + selectedSalaryDetails.overtimeSalary + selectedSalaryDetails.weeklyOvertimeSalary)}</span>
                  </div>
                </div>
              </div>

              {/* Rincian Tunjangan */}
              {selectedSalaryDetails.employee?.employeeAllowances && selectedSalaryDetails.employee.employeeAllowances.length > 0 && (
                <div className="p-4 bg-muted rounded-lg">
                  <Label className="text-sm font-medium mb-3 block">Rincian Tunjangan</Label>
                  <div className="space-y-3 text-sm">
                    {selectedSalaryDetails.employee.employeeAllowances
                      .filter((empAllowance: EmployeeAllowance) => empAllowance.isActive)
                      .map((empAllowance: EmployeeAllowance, index: number) => {
                        const companyAmount = empAllowance.allowance.companyAmount || 0;
                        const employeeAmount = empAllowance.allowance.employeeAmount || 0;
                        const netAmount = companyAmount - employeeAmount;
                        
                        return (
                          <div key={index} className="border border-gray-200 rounded-lg p-3 bg-white">
                            <div className="font-medium text-gray-800 mb-2">
                              {empAllowance.allowance.name}
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="text-green-600">• Kontribusi Perusahaan:</span>
                                <span className="font-medium text-green-600">
                                  +{formatCurrency(companyAmount)}
                                </span>
                              </div>
                              {employeeAmount > 0 && (
                                <div className="flex justify-between text-xs">
                                  <span className="text-red-600">• Potongan Karyawan:</span>
                                  <span className="font-medium text-red-600">
                                    -{formatCurrency(employeeAmount)}
                                  </span>
                                </div>
                              )}
                              <div className="flex justify-between text-xs border-t pt-1">
                                <span className="font-medium text-blue-600">• Net Tunjangan:</span>
                                <span className="font-bold text-blue-600">
                                  {netAmount >= 0 ? "+" : ""}{formatCurrency(netAmount)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    <div className="border-t-2 pt-3 flex justify-between font-semibold">
                      <span>Total Net Tunjangan:</span>
                      <span className={selectedSalaryDetails.totalAllowances >= 0 ? "text-green-600" : "text-red-600"}>
                        {selectedSalaryDetails.totalAllowances >= 0 ? "+" : ""}{formatCurrency(selectedSalaryDetails.totalAllowances)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {selectedSalaryDetails.employee?.employeeAllowances && selectedSalaryDetails.employee.employeeAllowances.filter((empAllowance: EmployeeAllowance) => empAllowance.isActive).length === 0 && (
                <div className="p-4 bg-muted rounded-lg">
                  <Label className="text-sm font-medium mb-2 block">Rincian Tunjangan</Label>
                  <p className="text-muted-foreground text-center py-2 text-sm">Tidak ada tunjangan aktif</p>
                </div>
              )}

              {/* Total Gaji Bersih */}
              <div className="p-4 bg-primary/10 rounded-lg">
                <div className="flex justify-between items-center">
                  <Label className="text-base font-semibold">Total Gaji Bersih</Label>
                  <span className="text-xl font-bold text-primary">
                    {formatCurrency(selectedSalaryDetails.totalSalary)}
                  </span>
                </div>
              </div>

              {/* Status Pembayaran */}
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-medium">Status Pembayaran</Label>
                  <Badge variant={selectedSalaryDetails.paymentStatus === 'PAID' ? 'default' : 'destructive'}>
                    {selectedSalaryDetails.paymentStatus === 'PAID' ? 'Sudah Dibayar' : 'Belum Dibayar'}
                  </Badge>
                </div>
              </div>

              {/* Tanggal Dibuat */}
              <div className="p-4 bg-muted rounded-lg">
                <Label className="text-sm font-medium">Tanggal Dibuat</Label>
                <p className="text-sm">
                  {format(new Date(selectedSalaryDetails.createdAt), 'dd MMMM yyyy HH:mm', { locale: id })}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin" />
                <p className="text-sm text-muted-foreground">Memuat detail gaji...</p>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
              Tutup
            </Button>
            {selectedSalaryDetails && (
              <SalarySlipPDF 
                salaryId={selectedSalaryDetails.id}
              />
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
