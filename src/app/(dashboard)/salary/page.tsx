"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { 
  Search, 
  PlusCircle,
  Loader2,
  RefreshCw,
  FileDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface Department {
  id: string;
  name: string;
}

interface Employee {
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

export default function SalaryPage() {
  // State management
  const [activeTab, setActiveTab] = useState("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterDepartment, setFilterDepartment] = useState("ALL");
  
  // Data state
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingOpen, setIsGeneratingOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedSalary, setSelectedSalary] = useState<Salary | null>(null);

  // Fetch salaries dengan filter
  const fetchSalaries = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      
      if (filterDepartment && filterDepartment !== "ALL") {
        params.append('departmentId', filterDepartment);
      }
      
      if (filterMonth && filterYear) {
        const startDate = new Date(filterYear, filterMonth - 1, 1).toISOString();
        const endDate = new Date(filterYear, filterMonth, 0).toISOString();
        params.append('startDate', startDate);
        params.append('endDate', endDate);
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

  // Generate gaji untuk periode tertentu
  const handleGenerateSalaries = async () => {
    try {
      const response = await fetch('/api/salaries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
                  body: JSON.stringify({
            year: filterYear,
            month: filterMonth,
            departmentId: filterDepartment !== "ALL" ? filterDepartment : undefined
          }),
      });
      
      if (response.ok) {
        const result = await response.json();
        toast.success(result.message || 'Gaji berhasil dihitung');
        setIsGeneratingOpen(false);
        fetchSalaries(); // Refresh data
      } else {
        const error = await response.json();
        toast.error(error.error || 'Gagal menghitung gaji');
      }
    } catch (error) {
      console.error('Error generating salaries:', error);
      toast.error('Terjadi kesalahan saat menghitung gaji');
    }
  };

  useEffect(() => {
    fetchDepartments();
    fetchSalaries();
  }, []);

  // Re-fetch when filters change
  useEffect(() => {
    fetchSalaries();
  }, [filterDepartment, filterMonth, filterYear]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Manajemen Penggajian</h1>
          <p className="text-muted-foreground">
            Sistem penggajian terintegrasi dengan kehadiran dan tunjangan
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsGeneratingOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Hitung Gaji
          </Button>
        </div>
      </div>

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
                Kelola perhitungan dan pembayaran gaji karyawan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row justify-between mb-4 gap-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 flex-1">
                  <div className="relative w-full max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Cari karyawan..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  
                  <div className="flex gap-2">
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
                  </div>
                </div>
                
                <Button onClick={fetchSalaries} disabled={isLoading}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
              
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID Karyawan</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead>Departemen</TableHead>
                      <TableHead>Periode</TableHead>
                      <TableHead className="text-right">Total Gaji</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center h-24">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                          <p className="mt-2">Memuat data gaji...</p>
                        </TableCell>
                      </TableRow>
                    ) : salaries.length > 0 ? (
                      salaries
                        .filter((salary) => 
                          searchTerm === "" || 
                          salary.employee.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          salary.employee.employeeId.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                        .map((salary) => (
                          <TableRow key={salary.id}>
                            <TableCell>{salary.employee.employeeId}</TableCell>
                            <TableCell className="font-medium">{salary.employee.user.name}</TableCell>
                            <TableCell>{salary.employee.department.name}</TableCell>
                            <TableCell>{format(new Date(salary.periodStart), 'MMM yyyy', { locale: id })}</TableCell>
                            <TableCell className="text-right">{formatCurrency(salary.totalSalary)}</TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                salary.paymentStatus === "PAID" 
                                  ? "bg-green-100 text-green-800" 
                                  : "bg-orange-100 text-orange-800"
                              }`}>
                                {salary.paymentStatus === "PAID" ? "Dibayar" : "Belum Dibayar"}
                              </span>
                            </TableCell>
                                                         <TableCell className="text-right">
                               <Button 
                                 variant="ghost" 
                                 size="sm"
                                 onClick={() => {
                                   setSelectedSalary(salary);
                                   setIsDetailOpen(true);
                                 }}
                               >
                                 Detail
                               </Button>
                             </TableCell>
                          </TableRow>
                        ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center h-24">
                          <div className="text-center space-y-2">
                            <p className="text-muted-foreground">Tidak ada data gaji ditemukan</p>
                                                         <p className="text-sm text-muted-foreground">
                               Klik tombol &quot;Hitung Gaji&quot; untuk membuat slip gaji berdasarkan data kehadiran
                             </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="configuration" className="mt-6">
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

      <Dialog open={isGeneratingOpen} onOpenChange={setIsGeneratingOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hitung Gaji Karyawan</DialogTitle>
            <DialogDescription>
              Hitung gaji berdasarkan data kehadiran
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium mb-1 block">Bulan</label>
                <Select value={String(filterMonth)} onValueChange={(value) => setFilterMonth(Number(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih bulan" />
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
                <Select value={String(filterYear)} onValueChange={(value) => setFilterYear(Number(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih tahun" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2023">2023</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGeneratingOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleGenerateSalaries}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Hitung Gaji
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Detail Slip Gaji */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Slip Gaji</DialogTitle>
            <DialogDescription>
              {selectedSalary && `${selectedSalary.employee.user.name} - ${format(new Date(selectedSalary.periodStart), 'MMMM yyyy', { locale: id })}`}
            </DialogDescription>
          </DialogHeader>
          
          {selectedSalary && (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">ID Karyawan</p>
                  <p className="font-medium">{selectedSalary.employee.employeeId}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Departemen</p>
                  <p className="font-medium">{selectedSalary.employee.department.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Posisi</p>
                  <p className="font-medium">{selectedSalary.employee.position?.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tipe Kontrak</p>
                  <p className="font-medium">
                    {selectedSalary.employee.contractType === 'PERMANENT' ? 'Tetap' : 'Training'}
                  </p>
                </div>
              </div>
              
              {/* Periode Gaji */}
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-3">Periode Gaji</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Dari</p>
                    <p className="font-medium">{format(new Date(selectedSalary.periodStart), 'dd MMMM yyyy', { locale: id })}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Sampai</p>
                    <p className="font-medium">{format(new Date(selectedSalary.periodEnd), 'dd MMMM yyyy', { locale: id })}</p>
                  </div>
                </div>
              </div>
              
              {/* Jam Kerja */}
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-3">Rekap Jam Kerja</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded">
                    <p className="text-sm text-muted-foreground">Jam Kerja Utama</p>
                    <p className="text-lg font-bold text-blue-600">{selectedSalary.mainWorkHours.toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">jam</p>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded">
                    <p className="text-sm text-muted-foreground">Lembur Reguler</p>
                    <p className="text-lg font-bold text-orange-600">{selectedSalary.regularOvertimeHours.toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">jam</p>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded">
                    <p className="text-sm text-muted-foreground">Lembur Mingguan</p>
                    <p className="text-lg font-bold text-purple-600">{selectedSalary.weeklyOvertimeHours.toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">jam</p>
                  </div>
                </div>
                <div className="mt-3 text-center p-2 bg-gray-50 rounded">
                  <p className="text-sm text-muted-foreground">Total Jam Kerja</p>
                  <p className="text-xl font-bold">
                    {(selectedSalary.mainWorkHours + selectedSalary.regularOvertimeHours + selectedSalary.weeklyOvertimeHours).toFixed(1)} jam
                  </p>
                </div>
              </div>
              
              {/* Rincian Gaji */}
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-3">Rincian Pendapatan</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b">
                    <div>
                      <p className="font-medium">Gaji Pokok</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedSalary.mainWorkHours.toFixed(1)} jam × tarif/jam
                      </p>
                    </div>
                    <p className="font-medium text-right">{formatCurrency(selectedSalary.baseSalary)}</p>
                  </div>
                  
                  {selectedSalary.overtimeSalary > 0 && (
                    <div className="flex justify-between items-center py-2 border-b">
                      <div>
                        <p className="font-medium">Gaji Lembur Reguler</p>
                        <p className="text-sm text-muted-foreground">
                          {selectedSalary.regularOvertimeHours.toFixed(1)} jam × tarif lembur
                        </p>
                      </div>
                      <p className="font-medium text-right">{formatCurrency(selectedSalary.overtimeSalary)}</p>
                    </div>
                  )}
                  
                  {selectedSalary.weeklyOvertimeSalary > 0 && (
                    <div className="flex justify-between items-center py-2 border-b">
                      <div>
                        <p className="font-medium">Gaji Lembur Mingguan</p>
                        <p className="text-sm text-muted-foreground">
                          {selectedSalary.weeklyOvertimeHours.toFixed(1)} jam × tarif lembur mingguan
                        </p>
                      </div>
                      <p className="font-medium text-right">{formatCurrency(selectedSalary.weeklyOvertimeSalary)}</p>
                    </div>
                  )}
                  
                  {selectedSalary.totalAllowances > 0 && (
                    <div className="flex justify-between items-center py-2 border-b">
                      <div>
                        <p className="font-medium">Total Tunjangan</p>
                        <p className="text-sm text-muted-foreground">Tunjangan karyawan</p>
                      </div>
                      <p className="font-medium text-right">{formatCurrency(selectedSalary.totalAllowances)}</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Total Gaji */}
              <div className="p-4 bg-primary/5 border-2 border-primary/20 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-lg font-semibold">Total Gaji Bersih</p>
                    <p className="text-sm text-muted-foreground">
                      Gaji pokok + lembur + tunjangan
                    </p>
                  </div>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(selectedSalary.totalSalary)}
                  </p>
                </div>
              </div>
              
              {/* Status & Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 border rounded">
                  <p className="text-sm text-muted-foreground">Status Pembayaran</p>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    selectedSalary.paymentStatus === "PAID" 
                      ? "bg-green-100 text-green-800" 
                      : "bg-orange-100 text-orange-800"
                  }`}>
                    {selectedSalary.paymentStatus === "PAID" ? "Sudah Dibayar" : "Belum Dibayar"}
                  </span>
                </div>
                
                <div className="p-3 border rounded">
                  <p className="text-sm text-muted-foreground">Tanggal Dibuat</p>
                  <p className="font-medium">
                    {format(new Date(selectedSalary.createdAt), 'dd MMM yyyy, HH:mm', { locale: id })}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
              Tutup
            </Button>
            <Button onClick={() => {
              // Implementasi cetak slip gaji
              window.print();
            }}>
              <FileDown className="mr-2 h-4 w-4" />
              Cetak Slip Gaji
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 