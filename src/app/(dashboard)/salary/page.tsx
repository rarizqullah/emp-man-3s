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
  FileCheck
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

// Tipe data untuk laporan gaji
interface SalaryRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  position: string;
  month: string;
  year: number;
  basicSalary: number;
  attendanceAllowance: number;
  performanceBonus: number;
  overtimePay: number;
  mealAllowance: number;
  transportAllowance: number;
  healthInsurance: number;
  taxDeduction: number;
  otherDeductions: number;
  netSalary: number;
  status: string;
  paymentDate: string | null;
}

// Contoh data gaji karyawan
const SALARY_DATA: SalaryRecord[] = [
  {
    id: "SLR001",
    employeeId: "EMP001",
    employeeName: "Ahmad Fauzi",
    department: "IT",
    position: "Senior Developer",
    month: "Januari",
    year: 2024,
    basicSalary: 8000000,
    attendanceAllowance: 500000,
    performanceBonus: 1000000,
    overtimePay: 450000,
    mealAllowance: 750000,
    transportAllowance: 500000,
    healthInsurance: 200000,
    taxDeduction: 500000,
    otherDeductions: 100000,
    netSalary: 10400000,
    status: "Dibayar",
    paymentDate: "2024-01-30T08:30:00",
  },
  {
    id: "SLR002",
    employeeId: "EMP002",
    employeeName: "Siti Rahayu",
    department: "HR",
    position: "HR Specialist",
    month: "Januari",
    year: 2024,
    basicSalary: 6500000,
    attendanceAllowance: 500000,
    performanceBonus: 500000,
    overtimePay: 200000,
    mealAllowance: 750000,
    transportAllowance: 500000,
    healthInsurance: 150000,
    taxDeduction: 350000,
    otherDeductions: 50000,
    netSalary: 7900000,
    status: "Dibayar",
    paymentDate: "2024-01-30T09:15:00",
  },
  {
    id: "SLR003",
    employeeId: "EMP003",
    employeeName: "Budi Santoso",
    department: "Finance",
    position: "Accountant",
    month: "Januari",
    year: 2024,
    basicSalary: 7000000,
    attendanceAllowance: 500000,
    performanceBonus: 750000,
    overtimePay: 300000,
    mealAllowance: 750000,
    transportAllowance: 500000,
    healthInsurance: 175000,
    taxDeduction: 400000,
    otherDeductions: 75000,
    netSalary: 9150000,
    status: "Dibayar",
    paymentDate: "2024-01-30T10:20:00",
  },
  {
    id: "SLR004",
    employeeId: "EMP004",
    employeeName: "Dewi Anggraini",
    department: "Marketing",
    position: "Marketing Manager",
    month: "Februari",
    year: 2024,
    basicSalary: 9000000,
    attendanceAllowance: 500000,
    performanceBonus: 1500000,
    overtimePay: 0,
    mealAllowance: 750000,
    transportAllowance: 750000,
    healthInsurance: 225000,
    taxDeduction: 600000,
    otherDeductions: 100000,
    netSalary: 11575000,
    status: "Diproses",
    paymentDate: null,
  },
  {
    id: "SLR005",
    employeeId: "EMP005",
    employeeName: "Eko Prasetyo",
    department: "Production",
    position: "Production Supervisor",
    month: "Februari",
    year: 2024,
    basicSalary: 7500000,
    attendanceAllowance: 500000,
    performanceBonus: 800000,
    overtimePay: 625000,
    mealAllowance: 750000,
    transportAllowance: 500000,
    healthInsurance: 187500,
    taxDeduction: 450000,
    otherDeductions: 80000,
    netSalary: 9457500,
    status: "Diproses",
    paymentDate: null,
  },
];

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

export default function SalaryPage() {
  const [activeTab, setActiveTab] = useState("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMonth, setFilterMonth] = useState("Februari");
  const [filterYear, setFilterYear] = useState(2024);
  const [filterDepartment, setFilterDepartment] = useState("");
  const [filteredData, setFilteredData] = useState<SalaryRecord[]>(SALARY_DATA);
  
  // Modal dialog status
  const [isGeneratingOpen, setIsGeneratingOpen] = useState(false);
  const [isProcessingOpen, setIsProcessingOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedSalary, setSelectedSalary] = useState<SalaryRecord | null>(null);
  
  // Filter data berdasarkan kriteria pencarian dan filter
  useEffect(() => {
    const filtered = SALARY_DATA.filter((record) => {
      const matchesSearch = searchTerm === "" || 
        (record.employeeName && record.employeeName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (record.employeeId && record.employeeId.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesMonth = filterMonth === "ALL" || record.month === filterMonth;
      const matchesYear = filterYear === "ALL" || (typeof filterYear === 'number' && filterYear === record.year);
      const matchesDepartment = filterDepartment === "ALL" || record.department === filterDepartment;
      
      return matchesSearch && matchesMonth && matchesYear && matchesDepartment;
    });
    
    setFilteredData(filtered);
  }, [searchTerm, filterMonth, filterYear, filterDepartment]);
  
  // Handler untuk membuka detail gaji
  const handleOpenDetail = (salary: SalaryRecord) => {
    setSelectedSalary(salary);
    setIsDetailOpen(true);
  };
  
  // Handler untuk membuka dialog pemrosesan gaji
  const handleOpenProcessing = () => {
    setIsProcessingOpen(true);
  };
  
  // Handler untuk membuka dialog pembuatan gaji massal
  const handleOpenGenerating = () => {
    setIsGeneratingOpen(true);
  };
  
  // Handler untuk ekspor data gaji
  const handleExportData = () => {
    console.log("Mengekspor data gaji:", filteredData);
    alert("Fungsi ekspor data akan diimplementasikan di sini");
    // TODO: Implementasi ekspor data ke Excel/CSV
  };
  
  // Handler untuk membuat slip gaji
  const handleGeneratePayslips = () => {
    console.log("Membuat slip gaji untuk karyawan");
    setIsGeneratingOpen(false);
    // TODO: Implementasi pembuatan slip gaji
  };
  
  // Handler untuk memproses pembayaran gaji
  const handleProcessPayments = () => {
    console.log("Memproses pembayaran gaji karyawan");
    setIsProcessingOpen(false);
    // TODO: Implementasi proses pembayaran gaji
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Manajemen Gaji</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleOpenProcessing}>
            <DollarSign className="mr-2 h-4 w-4" />
            Proses Pembayaran
          </Button>
          <Button onClick={handleOpenGenerating}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Buat Slip Gaji
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
                Kelola data gaji dan slip gaji karyawan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row justify-between mb-4 gap-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 flex-1">
                  <div className="relative w-full max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Cari nama karyawan..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Select value={filterMonth} onValueChange={setFilterMonth}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Bulan" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Semua</SelectItem>
                        <SelectItem value="Januari">Januari</SelectItem>
                        <SelectItem value="Februari">Februari</SelectItem>
                        <SelectItem value="Maret">Maret</SelectItem>
                        <SelectItem value="April">April</SelectItem>
                        <SelectItem value="Mei">Mei</SelectItem>
                        <SelectItem value="Juni">Juni</SelectItem>
                        <SelectItem value="Juli">Juli</SelectItem>
                        <SelectItem value="Agustus">Agustus</SelectItem>
                        <SelectItem value="September">September</SelectItem>
                        <SelectItem value="Oktober">Oktober</SelectItem>
                        <SelectItem value="November">November</SelectItem>
                        <SelectItem value="Desember">Desember</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select 
                      value={String(filterYear)} 
                      onValueChange={(value) => setFilterYear(Number(value))}
                    >
                      <SelectTrigger className="w-[100px]">
                        <SelectValue placeholder="Tahun" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Semua</SelectItem>
                        <SelectItem value="2024">2024</SelectItem>
                        <SelectItem value="2023">2023</SelectItem>
                        <SelectItem value="2022">2022</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Departemen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Semua</SelectItem>
                        <SelectItem value="IT">IT</SelectItem>
                        <SelectItem value="HR">HR</SelectItem>
                        <SelectItem value="Finance">Finance</SelectItem>
                        <SelectItem value="Marketing">Marketing</SelectItem>
                        <SelectItem value="Production">Production</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <Button variant="outline" onClick={handleExportData}>
                  <FileDown className="mr-2 h-4 w-4" />
                  Export Data
                </Button>
              </div>
              
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead>Departemen</TableHead>
                      <TableHead>Jabatan</TableHead>
                      <TableHead>Periode</TableHead>
                      <TableHead className="text-right">Gaji Pokok</TableHead>
                      <TableHead className="text-right">Total Tunjangan</TableHead>
                      <TableHead className="text-right">Total Potongan</TableHead>
                      <TableHead className="text-right">Gaji Bersih</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.length > 0 ? (
                      filteredData.map((record) => {
                        const totalAllowances = 
                          record.attendanceAllowance + 
                          record.performanceBonus + 
                          record.overtimePay + 
                          record.mealAllowance + 
                          record.transportAllowance;
                          
                        const totalDeductions = 
                          record.healthInsurance + 
                          record.taxDeduction + 
                          record.otherDeductions;
                          
                        return (
                          <TableRow key={record.id}>
                            <TableCell>{record.employeeId}</TableCell>
                            <TableCell className="font-medium">{record.employeeName}</TableCell>
                            <TableCell>{record.department}</TableCell>
                            <TableCell>{record.position}</TableCell>
                            <TableCell>{record.month} {record.year}</TableCell>
                            <TableCell className="text-right">{formatCurrency(record.basicSalary)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(totalAllowances)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(totalDeductions)}</TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(record.netSalary)}</TableCell>
                            <TableCell>
                              <Badge variant={
                                record.status === "Dibayar" ? "default" : 
                                record.status === "Diproses" ? "secondary" : "outline"
                              }>
                                {record.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleOpenDetail(record)}
                                >
                                  <FileCheck className="h-4 w-4" />
                                  <span className="sr-only">Detail</span>
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center h-24">
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
        
        <TabsContent value="configuration" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Konfigurasi Gaji</CardTitle>
              <CardDescription>
                Pengaturan komponen gaji dan tunjangan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Tunjangan</h3>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 border rounded-md">
                      <div>
                        <p className="font-medium">Tunjangan Makan</p>
                        <p className="text-sm text-muted-foreground">Tunjangan untuk makan harian</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(750000)}</p>
                        <p className="text-sm text-muted-foreground">per bulan</p>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center p-3 border rounded-md">
                      <div>
                        <p className="font-medium">Tunjangan Transportasi</p>
                        <p className="text-sm text-muted-foreground">Tunjangan untuk transportasi</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(500000)}</p>
                        <p className="text-sm text-muted-foreground">per bulan</p>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center p-3 border rounded-md">
                      <div>
                        <p className="font-medium">Tunjangan Kehadiran</p>
                        <p className="text-sm text-muted-foreground">Bonus untuk kehadiran penuh</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(500000)}</p>
                        <p className="text-sm text-muted-foreground">per bulan</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Potongan</h3>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 border rounded-md">
                      <div>
                        <p className="font-medium">BPJS Kesehatan</p>
                        <p className="text-sm text-muted-foreground">Iuran wajib asuransi kesehatan</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">2.5%</p>
                        <p className="text-sm text-muted-foreground">dari gaji pokok</p>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center p-3 border rounded-md">
                      <div>
                        <p className="font-medium">Pajak Penghasilan</p>
                        <p className="text-sm text-muted-foreground">PPh 21</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">5-15%</p>
                        <p className="text-sm text-muted-foreground">sesuai ketentuan</p>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center p-3 border rounded-md">
                      <div>
                        <p className="font-medium">BPJS Ketenagakerjaan</p>
                        <p className="text-sm text-muted-foreground">Iuran jaminan pensiun & ketenagakerjaan</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">3%</p>
                        <p className="text-sm text-muted-foreground">dari gaji pokok</p>
                      </div>
                    </div>
                  </div>
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
              {selectedSalary && `${selectedSalary.employeeName} - ${selectedSalary.month} ${selectedSalary.year}`}
            </DialogDescription>
          </DialogHeader>
          
          {selectedSalary && (
            <div className="space-y-6">
              <div className="flex justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">ID Karyawan</p>
                  <p className="font-medium">{selectedSalary.employeeId}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Departemen</p>
                  <p className="font-medium">{selectedSalary.department} - {selectedSalary.position}</p>
                </div>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b">
                <p className="font-medium">Pendapatan</p>
                <p className="font-medium">Jumlah</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <p>Gaji Pokok</p>
                  <p className="text-right">{formatCurrency(selectedSalary.basicSalary)}</p>
                </div>
                <div className="flex justify-between">
                  <p>Tunjangan Kehadiran</p>
                  <p className="text-right">{formatCurrency(selectedSalary.attendanceAllowance)}</p>
                </div>
                <div className="flex justify-between">
                  <p>Bonus Kinerja</p>
                  <p className="text-right">{formatCurrency(selectedSalary.performanceBonus)}</p>
                </div>
                <div className="flex justify-between">
                  <p>Upah Lembur</p>
                  <p className="text-right">{formatCurrency(selectedSalary.overtimePay)}</p>
                </div>
                <div className="flex justify-between">
                  <p>Tunjangan Makan</p>
                  <p className="text-right">{formatCurrency(selectedSalary.mealAllowance)}</p>
                </div>
                <div className="flex justify-between">
                  <p>Tunjangan Transportasi</p>
                  <p className="text-right">{formatCurrency(selectedSalary.transportAllowance)}</p>
                </div>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b">
                <p className="font-medium">Potongan</p>
                <p className="font-medium">Jumlah</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <p>BPJS Kesehatan</p>
                  <p className="text-right">{formatCurrency(selectedSalary.healthInsurance)}</p>
                </div>
                <div className="flex justify-between">
                  <p>Pajak Penghasilan</p>
                  <p className="text-right">{formatCurrency(selectedSalary.taxDeduction)}</p>
                </div>
                <div className="flex justify-between">
                  <p>Potongan Lainnya</p>
                  <p className="text-right">{formatCurrency(selectedSalary.otherDeductions)}</p>
                </div>
              </div>
              
              <div className="flex justify-between items-center py-2 border-t border-b">
                <p className="font-medium">Total Pendapatan</p>
                <p className="font-medium text-right">
                  {formatCurrency(
                    selectedSalary.basicSalary +
                    selectedSalary.attendanceAllowance +
                    selectedSalary.performanceBonus +
                    selectedSalary.overtimePay +
                    selectedSalary.mealAllowance +
                    selectedSalary.transportAllowance
                  )}
                </p>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b">
                <p className="font-medium">Total Potongan</p>
                <p className="font-medium text-right">
                  {formatCurrency(
                    selectedSalary.healthInsurance +
                    selectedSalary.taxDeduction +
                    selectedSalary.otherDeductions
                  )}
                </p>
              </div>
              
              <div className="flex justify-between items-center py-2">
                <p className="font-medium text-lg">Gaji Bersih</p>
                <p className="font-bold text-lg text-right">{formatCurrency(selectedSalary.netSalary)}</p>
              </div>
              
              <div className="flex justify-between text-sm">
                <p className="text-muted-foreground">Status Pembayaran</p>
                <Badge variant={selectedSalary.status === "Dibayar" ? "default" : "secondary"}>
                  {selectedSalary.status}
                </Badge>
              </div>
              
              {selectedSalary.paymentDate && (
                <div className="flex justify-between text-sm">
                  <p className="text-muted-foreground">Tanggal Pembayaran</p>
                  <p>{formatDate(selectedSalary.paymentDate)}</p>
                </div>
              )}
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
      
      {/* Dialog untuk pembuatan slip gaji */}
      <Dialog open={isGeneratingOpen} onOpenChange={setIsGeneratingOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buat Slip Gaji</DialogTitle>
            <DialogDescription>
              Buat slip gaji untuk periode bulan ini
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium mb-1 block">Bulan</label>
                <Select defaultValue="Februari">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Januari">Januari</SelectItem>
                    <SelectItem value="Februari">Februari</SelectItem>
                    <SelectItem value="Maret">Maret</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex-1">
                <label className="text-sm font-medium mb-1 block">Tahun</label>
                <Select defaultValue="2024">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2023">2023</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Departemen</label>
              <Select defaultValue="all">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Departemen</SelectItem>
                  <SelectItem value="IT">IT</SelectItem>
                  <SelectItem value="HR">HR</SelectItem>
                  <SelectItem value="Finance">Finance</SelectItem>
                  <SelectItem value="Marketing">Marketing</SelectItem>
                  <SelectItem value="Production">Production</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium mb-1 block">Opsi Perhitungan</label>
              
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="includeAttendance" className="form-checkbox" defaultChecked />
                <label htmlFor="includeAttendance">Hitung tunjangan kehadiran</label>
              </div>
              
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="includeOvertime" className="form-checkbox" defaultChecked />
                <label htmlFor="includeOvertime">Hitung lembur</label>
              </div>
              
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="includePerformance" className="form-checkbox" defaultChecked />
                <label htmlFor="includePerformance">Hitung bonus kinerja</label>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGeneratingOpen(false)}>Batal</Button>
            <Button onClick={handleGeneratePayslips}>Buat Slip Gaji</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog untuk proses pembayaran */}
      <Dialog open={isProcessingOpen} onOpenChange={setIsProcessingOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Proses Pembayaran Gaji</DialogTitle>
            <DialogDescription>
              Proses pembayaran gaji untuk karyawan bulan ini
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium mb-1 block">Bulan</label>
                <Select defaultValue="Februari">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Januari">Januari</SelectItem>
                    <SelectItem value="Februari">Februari</SelectItem>
                    <SelectItem value="Maret">Maret</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex-1">
                <label className="text-sm font-medium mb-1 block">Tahun</label>
                <Select defaultValue="2024">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2023">2023</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Metode Pembayaran</label>
              <Select defaultValue="transfer">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transfer">Transfer Bank</SelectItem>
                  <SelectItem value="cash">Tunai</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Tanggal Pembayaran</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(new Date(), "PPP", { locale: id })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Catatan</label>
              <Input placeholder="Catatan pembayaran (opsional)" />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProcessingOpen(false)}>Batal</Button>
            <Button onClick={handleProcessPayments}>Proses Pembayaran</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 