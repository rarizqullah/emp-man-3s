"use client";

import { useState, useEffect, useCallback } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { id } from "date-fns/locale";
import {
  Search,
  FileDown,
  Calendar as CalendarIcon,
  RefreshCw,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "react-hot-toast";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import * as XLSX from 'xlsx';

// Tipe data untuk riwayat kehadiran
interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  departmentName: string;
  shiftName: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  mainWorkHours: number | null;
  regularOvertimeHours: number | null;
  weeklyOvertimeHours: number | null;
  status: string;
  attendanceDate: string;
  // Break times
  breakStartTime: string | null;
  breakEndTime: string | null;
  // Overtime times
  overtimeStartTime: string | null;
  overtimeEndTime: string | null;
  // Auto cutoff info
  isAutoCutOff: boolean;
  autoCutOffReason: string | null;
  // Validation status
  isCheckInValidated: boolean;
  isCheckOutValidated: boolean;
  // Lateness info
  isLate: boolean;
  minutesLate: number | null;
  roundedMinutesLate: number | null;
  latenessMessage: string | null;
}

// Format waktu
const formatTime = (timeString: string | null) => {
  if (!timeString) return "-";
  return format(new Date(timeString), "HH:mm:ss", { locale: id });
};

// Format tanggal
const formatDate = (dateString: string) => {
  return format(new Date(dateString), "d MMMM yyyy", { locale: id });
};

export default function AttendanceHistoryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterLateness, setFilterLateness] = useState("all");
  const [date, setDate] = useState<Date>(new Date());
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [filteredData, setFilteredData] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [departments, setDepartments] = useState<string[]>([]);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Fungsi untuk fetch data department
  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/departments');
      if (response.ok) {
        const departments = await response.json();
        // API mengembalikan array departments langsung, bukan dalam format { success: true, departments: [...] }
        if (Array.isArray(departments)) {
          const departmentNames = departments.map((dept: { name: string }) => dept.name);
          setDepartments(departmentNames);
        }
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  // Fungsi untuk fetch data attendance
  const fetchAttendanceData = useCallback(async () => {
    setIsLoading(true);
    try {
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      
      const startDate = format(monthStart, 'yyyy-MM-dd');
      const endDate = format(monthEnd, 'yyyy-MM-dd');
      
      console.log(`Fetching attendance data dari ${startDate} sampai ${endDate}`);
      
      const response = await fetch(`/api/attendance/list?startDate=${startDate}&endDate=${endDate}&limit=100`);
      
      if (!response.ok) {
        throw new Error('Gagal mengambil data riwayat kehadiran');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setAttendanceData(data.attendances || []);
        console.log(`Berhasil memuat ${data.attendances?.length || 0} data riwayat kehadiran`);
      } else {
        throw new Error(data.message || 'Gagal mengambil data riwayat kehadiran');
      }
    } catch (error) {
      console.error('Error fetching attendance data:', error);
      toast.error('Gagal memuat data riwayat kehadiran. Silakan coba lagi.');
      setAttendanceData([]);
    } finally {
      setIsLoading(false);
    }
  }, [date]);

  // Filter data berdasarkan parameter pencarian dan filter
  useEffect(() => {
    const filtered = attendanceData.filter(record => {
      const matchesSearch =
        record.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.employeeId.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDepartment = filterDepartment === "all" || record.departmentName === filterDepartment;
      const matchesStatus = filterStatus === "all" || record.status === filterStatus;

      const matchesLateness = filterLateness === "all" || 
        (filterLateness === "late" && record.isLate) ||
        (filterLateness === "ontime" && !record.isLate);

      return matchesSearch && matchesDepartment && matchesStatus && matchesLateness;
    });

    setFilteredData(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [searchTerm, filterDepartment, filterStatus, filterLateness, attendanceData]);

  // Pagination logic
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handle page size change
  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1); // Reset to first page
  };

  // Fetch data saat komponen dimuat atau tanggal berubah
  useEffect(() => {
    fetchAttendanceData();
  }, [date, fetchAttendanceData]);

  // Fetch departments saat komponen dimuat
  useEffect(() => {
    fetchDepartments();
  }, []);

  // Handler untuk pergantian bulan pada kalender
  const handleMonthChange = (newDate: Date) => {
    setDate(newDate);
  };

  // Handler untuk ekspor data kehadiran
  const handleExportData = () => {
    try {
      const dataToExport = filteredData.map((record, index) => ({
        'No': index + 1,
        'Tanggal': formatDate(record.attendanceDate),
        'ID Karyawan': record.employeeId,
        'Nama': record.employeeName,
        'Departemen': record.departmentName,
        'Shift': record.shiftName,
        'Jam Masuk': formatTime(record.checkInTime),
        'Jam Keluar': formatTime(record.checkOutTime),
        'Istirahat Mulai': formatTime(record.breakStartTime),
        'Istirahat Selesai': formatTime(record.breakEndTime),
        'Lembur Mulai': formatTime(record.overtimeStartTime),
        'Lembur Selesai': formatTime(record.overtimeEndTime),
        'Jam Kerja': record.mainWorkHours ? `${record.mainWorkHours.toFixed(2)}h` : '-',
        'Lembur Reguler': record.regularOvertimeHours ? `${record.regularOvertimeHours.toFixed(2)}h` : '-',
        'Lembur Mingguan': record.weeklyOvertimeHours ? `${record.weeklyOvertimeHours.toFixed(2)}h` : '-',
        'Keterlambatan': record.isLate ? `${record.roundedMinutesLate || record.minutesLate}m` : '-',
        'Status': record.status,
        'Check-in Tervalidasi': record.isCheckInValidated ? 'Ya' : 'Tidak',
        'Check-out Tervalidasi': record.isCheckOutValidated ? 'Ya' : 'Tidak'
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      
      // Set column widths
      const colWidths = [
        { wch: 5 },   // No
        { wch: 15 },  // Tanggal
        { wch: 15 },  // ID
        { wch: 25 },  // Nama
        { wch: 20 },  // Departemen
        { wch: 15 },  // Shift
        { wch: 12 },  // Jam Masuk
        { wch: 12 },  // Jam Keluar
        { wch: 15 },  // Istirahat Mulai
        { wch: 15 },  // Istirahat Selesai
        { wch: 15 },  // Lembur Mulai
        { wch: 15 },  // Lembur Selesai
        { wch: 12 },  // Jam Kerja
        { wch: 15 },  // Lembur Reguler
        { wch: 15 },  // Lembur Mingguan
        { wch: 15 },  // Keterlambatan
        { wch: 12 },  // Status
        { wch: 18 },  // Check-in Tervalidasi
        { wch: 18 }   // Check-out Tervalidasi
      ];
      ws['!cols'] = colWidths;
      
      XLSX.utils.book_append_sheet(wb, ws, 'Riwayat Kehadiran');
      
      const fileName = `Riwayat_Kehadiran_${format(date, 'yyyy-MM')}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      toast.success(`Data berhasil diekspor ke ${fileName}`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Gagal mengekspor data ke Excel');
    }
  };

  // Fungsi untuk refresh data
  const handleRefreshData = () => {
    fetchAttendanceData();
  };

  // Fungsi untuk menentukan status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return { variant: "default" as const, label: "Hadir" };
      case 'LATE':
        return { variant: "secondary" as const, label: "Terlambat" };
      case 'ABSENT':
        return { variant: "destructive" as const, label: "Tidak Hadir" };
      default:
        return { variant: "outline" as const, label: status };
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="typography-h1">Riwayat Kehadiran</h1>
          <p className="typography-muted mt-2">Lihat dan kelola riwayat kehadiran karyawan untuk bulan {format(date, "MMMM yyyy", { locale: id })}</p>
        </div>
        <Button variant="outline" onClick={handleRefreshData} disabled={isLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Riwayat Kehadiran</CardTitle>
          <CardDescription>
            Lihat dan kelola riwayat kehadiran karyawan untuk bulan {format(date, "MMMM yyyy", { locale: id })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Summary info */}
          <div className="mb-4 text-sm text-muted-foreground">
            Menampilkan {startIndex + 1}-{Math.min(endIndex, filteredData.length)} dari {filteredData.length} data riwayat kehadiran
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
                  disabled={isLoading}
                />
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" disabled={isLoading}>
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
                          <SelectItem value="all">Semua</SelectItem>
                          {departments.map((dept) => (
                            <SelectItem key={dept} value={dept}>
                              {dept}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="mb-2">
                      <label className="text-xs font-medium mb-1 block">Status</label>
                      <Select 
                        value={filterStatus} 
                        onValueChange={setFilterStatus}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Semua" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Semua</SelectItem>
                          <SelectItem value="PRESENT">Hadir</SelectItem>
                          <SelectItem value="LATE">Terlambat</SelectItem>
                          <SelectItem value="ABSENT">Tidak Hadir</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="mb-2">
                      <label className="text-xs font-medium mb-1 block">Keterlambatan</label>
                      <Select 
                        value={filterLateness} 
                        onValueChange={setFilterLateness}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Semua" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Semua</SelectItem>
                          <SelectItem value="late">Terlambat</SelectItem>
                          <SelectItem value="ontime">Tepat Waktu</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" disabled={isLoading}>
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {format(date, "MMMM yyyy", { locale: id })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(date) => date && setDate(date)}
                    month={date}
                    onMonthChange={handleMonthChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleRefreshData} disabled={isLoading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="outline" onClick={handleExportData} disabled={isLoading}>
                <FileDown className="mr-2 h-4 w-4" />
                Export Excel
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Memuat data riwayat kehadiran...</span>
            </div>
          ) : (
            <div className="rounded-md border bg-background shadow-sm">
              <Table>
                <TableHeader className="bg-muted/50 border-b">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="px-4 py-3 font-semibold text-muted-foreground">Tanggal</TableHead>
                    <TableHead className="px-4 py-3 font-semibold text-muted-foreground">ID</TableHead>
                    <TableHead className="px-4 py-3 font-semibold text-muted-foreground">Nama</TableHead>
                    <TableHead className="px-4 py-3 font-semibold text-muted-foreground">Departemen</TableHead>
                    <TableHead className="px-4 py-3 font-semibold text-muted-foreground">Shift</TableHead>
                    <TableHead className="px-4 py-3 font-semibold text-muted-foreground">Masuk</TableHead>
                    <TableHead className="px-4 py-3 font-semibold text-muted-foreground">Keluar</TableHead>
                    <TableHead className="px-4 py-3 font-semibold text-muted-foreground">Istirahat Mulai</TableHead>
                    <TableHead className="px-4 py-3 font-semibold text-muted-foreground">Istirahat Selesai</TableHead>
                    <TableHead className="px-4 py-3 font-semibold text-muted-foreground">Lembur Mulai</TableHead>
                    <TableHead className="px-4 py-3 font-semibold text-muted-foreground">Lembur Selesai</TableHead>
                    <TableHead className="px-4 py-3 font-semibold text-muted-foreground">Jam Kerja</TableHead>
                    <TableHead className="px-4 py-3 font-semibold text-muted-foreground">Lembur Reguler</TableHead>
                    <TableHead className="px-4 py-3 font-semibold text-muted-foreground">Lembur Mingguan</TableHead>
                    <TableHead className="px-4 py-3 font-semibold text-muted-foreground">Keterlambatan</TableHead>
                    <TableHead className="px-4 py-3 font-semibold text-muted-foreground">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.length > 0 ? (
                    paginatedData.map((record) => (
                      <TableRow key={record.id} className="hover:bg-muted/50 transition-colors border-b last:border-b-0">
                        <TableCell className="px-4 py-3 font-mono text-sm">{formatDate(record.attendanceDate)}</TableCell>
                        <TableCell className="px-4 py-3 font-mono text-sm">{record.employeeId}</TableCell>
                        <TableCell className="px-4 py-3 font-medium">{record.employeeName}</TableCell>
                        <TableCell className="px-4 py-3">{record.departmentName}</TableCell>
                        <TableCell className="px-4 py-3">{record.shiftName}</TableCell>
                        <TableCell className="px-4 py-3 font-mono text-sm">
                          <div className="flex flex-col">
                            <span>{formatTime(record.checkInTime)}</span>
                            {record.isCheckInValidated && (
                              <span className="text-xs text-green-600">✓ Tervalidasi</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 font-mono text-sm">
                          <div className="flex flex-col">
                            <span>{formatTime(record.checkOutTime)}</span>
                            {record.isCheckOutValidated && (
                              <span className="text-xs text-green-600">✓ Tervalidasi</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 font-mono text-sm">{formatTime(record.breakStartTime)}</TableCell>
                        <TableCell className="px-4 py-3 font-mono text-sm">{formatTime(record.breakEndTime)}</TableCell>
                        <TableCell className="px-4 py-3 font-mono text-sm">{formatTime(record.overtimeStartTime)}</TableCell>
                        <TableCell className="px-4 py-3 font-mono text-sm">{formatTime(record.overtimeEndTime)}</TableCell>
                        <TableCell className="px-4 py-3 font-mono text-sm">
                          {record.mainWorkHours ? `${record.mainWorkHours.toFixed(2)}h` : "-"}
                        </TableCell>
                        <TableCell className="px-4 py-3 font-mono text-sm">
                          {record.regularOvertimeHours ? `${record.regularOvertimeHours.toFixed(2)}h` : "-"}
                        </TableCell>
                        <TableCell className="px-4 py-3 font-mono text-sm">
                          {record.weeklyOvertimeHours ? `${record.weeklyOvertimeHours.toFixed(2)}h` : "-"}
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          {record.isLate ? (
                            <div className="flex flex-col">
                              <Badge variant="destructive" className="text-xs mb-1">
                                Terlambat {record.roundedMinutesLate || record.minutesLate}m
                              </Badge>
                              {record.latenessMessage && (
                                <span className="text-xs text-muted-foreground">
                                  {record.latenessMessage}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <Badge variant={getStatusBadge(record.status).variant}>
                            {getStatusBadge(record.status).label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={16} className="text-center h-24">
                        <div className="flex flex-col items-center gap-2">
                          <div>
                            <p className="font-medium">Tidak ada data riwayat kehadiran</p>
                            <p className="text-sm text-muted-foreground">
                              {filteredData.length === 0 && attendanceData.length === 0
                                ? "Tidak ada data kehadiran untuk bulan ini"
                                : "Tidak ada data yang sesuai dengan filter pencarian"
                              }
                            </p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              <DataTablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredData.length}
                itemsPerPage={pageSize}
                onPageChange={handlePageChange}
                onItemsPerPageChange={handlePageSizeChange}
                itemName="data riwayat kehadiran"
                showRowsPerPage={true}
                showFirstLastButtons={true}
                showPageNumbers={true}
                className="border-t"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 