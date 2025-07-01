"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { id } from 'date-fns/locale';
import {
  Clock,
  Search,
  UserCheck,
  Calendar as CalendarIcon,
  RefreshCw,
  Users,
  FileDown,
  Filter
} from "lucide-react";
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import AttendanceFaceRecognition from '@/components/attendance/AttendanceFaceRecognition';
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
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import * as XLSX from 'xlsx';

import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Interface untuk data presensi
interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  shift: string;
  checkInTime: string;
  checkOutTime: string | null;
  mainWorkHours: number | null;
  overtimeHours: number | null;
  weeklyOvertimeHours: number | null;
  status: string; // Updated to support new status types
  // Kolom jam istirahat dan lembur
  breakStartTime?: string | null;
  breakEndTime?: string | null;
  overtimeStartTime?: string | null;
  overtimeEndTime?: string | null;
  // Info shift
  shiftEndTime?: string | null;
  lunchBreakStart?: string | null;
  lunchBreakEnd?: string | null;
  regularOvertimeStart?: string | null;
  regularOvertimeEnd?: string | null;
}

interface EmployeeInfo {
  id: string;
  name: string;
  department: string;
  shift: string;
}

export default function AttendancePage() {
  const router = useRouter();
  const [date] = useState<Date>(new Date());
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('attendance');
  const [currentTime, setCurrentTime] = useState<string>(format(new Date(), 'HH:mm:ss'));
  const [employeeInfo, setEmployeeInfo] = useState<EmployeeInfo | null>(null); // Mulai dengan null - akan diset setelah face recognition
  const [isCheckedIn, setIsCheckedIn] = useState<boolean>(false);
  const [mode, setMode] = useState<'checkIn' | 'checkOut'>('checkIn');
  const [manualEmployeeId, setManualEmployeeId] = useState<string>("");
  const [isManualDialogOpen, setIsManualDialogOpen] = useState<boolean>(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Filter state
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [shiftFilter, setShiftFilter] = useState<string>("all");

  // Department options untuk filter
  const [departments, setDepartments] = useState<string[]>([]);
  const [shifts, setShifts] = useState<string[]>([]);

  // Format time untuk tampilan
  const formatTime = (timeString: string | null | undefined): string => {
    if (!timeString) return "-";
    return format(new Date(timeString), "HH:mm:ss");
  };

  // Fungsi untuk mendapatkan data presensi hari ini
  const fetchTodayAttendance = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/attendance/today-public');

      if (!response.ok) {
        throw new Error('Gagal mendapatkan data presensi');
      }

      const data = await response.json();
      
      if (data.success) {
        setAttendanceData(data.attendances || []);
        console.log(`Berhasil memuat ${data.attendances?.length || 0} data presensi hari ini`);
      } else {
        throw new Error(data.error || 'Gagal mendapatkan data presensi');
      }
    } catch (error) {
      console.error('Error fetching attendance data:', error);
      toast.error('Gagal memuat data presensi. Silakan coba lagi.');
      // Set empty array instead of dummy data
      setAttendanceData([]);
    } finally {
      setIsLoading(false);
    }
  };



  // Fungsi untuk memperbarui jam saat ini
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(format(new Date(), 'HH:mm:ss'));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Ambil data saat komponen dimuat
  useEffect(() => {
    fetchTodayAttendance();
    // Tidak lagi auto-load employee info saat halaman dimuat
    // Employee info akan dimuat setelah face recognition berhasil
  }, []);

  // Filter logic
  const filteredAttendance = attendanceData.filter((attendance) => {
    const matchesSearch = 
      attendance.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      attendance.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      attendance.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      attendance.shift.toLowerCase().includes(searchTerm.toLowerCase());

    // Department filter
    const matchesDepartment = departmentFilter === "all" || attendance.department === departmentFilter;

    // Status filter
    const matchesStatus = statusFilter === "all" || attendance.status === statusFilter;

    // Shift filter
    const matchesShift = shiftFilter === "all" || attendance.shift === shiftFilter;

    return matchesSearch && matchesDepartment && matchesStatus && matchesShift;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredAttendance.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = filteredAttendance.slice(startIndex, endIndex);

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handle page size change
  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1); // Reset to first page
  };
  
  // Extract unique departments and shifts untuk filter
  useEffect(() => {
    if (attendanceData.length > 0) {
      const uniqueDepartments = [...new Set(attendanceData.map(item => item.department))];
      const uniqueShifts = [...new Set(attendanceData.map(item => item.shift))];
      setDepartments(uniqueDepartments);
      setShifts(uniqueShifts);
    }
  }, [attendanceData]);

  // Fungsi untuk export data ke Excel
  const handleExportToExcel = () => {
    try {
      const dataToExport = filteredAttendance.map(attendance => ({
        'ID Karyawan': attendance.employeeId,
        'Nama': attendance.employeeName,
        'Departemen': attendance.department,
        'Shift': attendance.shift,
        'Jam Masuk': formatTime(attendance.checkInTime),
        'Jam Keluar': formatTime(attendance.checkOutTime),
        'Istirahat Mulai': formatTime(attendance.breakStartTime),
        'Istirahat Selesai': formatTime(attendance.breakEndTime),
        'Lembur Mulai': formatTime(attendance.overtimeStartTime),
        'Lembur Selesai': formatTime(attendance.overtimeEndTime),
        'Status': attendance.status
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Presensi Hari Ini');
      
      const fileName = `presensi-${format(date, 'yyyy-MM-dd')}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      toast.success('Data presensi berhasil diunduh');
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Gagal mengunduh data presensi');
    }
  };

  // Status badge helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Divalidasi":
      case "PRESENT":
        return { variant: "default" as const, className: "bg-green-100 text-green-800" };
      case "Sedang Berlangsung":
      case "IN_PROGRESS":
        return { variant: "secondary" as const, className: "bg-blue-100 text-blue-800" };
      case "LATE":
        return { variant: "destructive" as const, className: "bg-yellow-100 text-yellow-800" };
      case "ABSENT":
        return { variant: "destructive" as const, className: "bg-red-100 text-red-800" };
      default:
        return { variant: "outline" as const, className: "bg-gray-100 text-gray-800" };
    }
  };

  // Fetch data presensi untuk hari ini
  const fetchAttendance = async () => {
    try {
      // Jika tidak ada employee info, skip
      if (!employeeInfo || !employeeInfo.id) {
        console.log("Skipping attendance fetch - no valid employee");
        setMode('checkIn');
        setIsCheckedIn(false);
        return;
      }
      
      // Determine mode berdasarkan status attendance saat ini
      const currentMode = await determineAttendanceMode(employeeInfo.id);
      setMode(currentMode);
      setIsCheckedIn(currentMode === 'checkOut');
      
      console.log(`Attendance mode set to ${currentMode} for ${employeeInfo.name}`);
    } catch (error) {
      console.error("Error fetching attendance:", error);
      // Default ke check-in mode
      setMode('checkIn');
      setIsCheckedIn(false);
    }
  };

  // Handle presensi berhasil
  const handleSuccessfulRecognition = async (employeeId: string) => {
    setIsLoading(true);
    try {
      // Check current attendance status untuk menentukan mode
      const currentMode = await determineAttendanceMode(employeeId);
      
      // Tentukan endpoint berdasarkan mode
      const endpoint = currentMode === 'checkIn' ? '/api/attendance/check-in' : '/api/attendance/check-out';
      
      console.log(`Processing ${currentMode} for employee ${employeeId}`);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ employeeId }),
      });

      const result = await response.json();

      if (result.success) {
        // Handle successful attendance
        if (result.data?.latenessInfo?.isLate) {
          toast.error(result.data.latenessInfo.latenessMessage, {
            duration: 8000,
            icon: '⚠️',
          });
          
          toast.success('Check-in berhasil dicatat dengan pembulatan waktu', {
            duration: 4000,
          });
        } else {
          toast.success(result.message);
        }
        
        await fetchTodayAttendance();
        
        const newMode = currentMode === 'checkIn' ? 'checkOut' : 'checkIn';
        setMode(newMode);
        
        if (currentMode === 'checkIn') {
          setIsCheckedIn(true);
        } else {
          setIsCheckedIn(false);
        }
        
        setEmployeeInfo({
          id: result.data?.employeeId || employeeId,
          name: result.data?.employeeName || '',
          department: result.data?.department || '',
          shift: result.data?.shift || ''
        });
        
      } else {
        // Enhanced error handling
        if (response.status === 403) {
          // Shift validation error - show specific message
          toast.error(result.error || 'Presensi tidak diizinkan di luar jam shift', {
            duration: 10000,
            icon: '🚫',
          });
        } else {
          // Other errors
          toast.error(result.error || result.message || `Gagal melakukan ${currentMode}`);
        }
      }
    } catch (error) {
      console.error(`Error during attendance:`, error);
      toast.error(`Terjadi kesalahan saat melakukan presensi`);
    } finally {
      setIsLoading(false);
    }
  };

  // Determine attendance mode based on current status
  const determineAttendanceMode = async (employeeId: string): Promise<'checkIn' | 'checkOut'> => {
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      
      const response = await fetch(`/api/attendance/check-status?employeeId=${employeeId}&date=${today}`);
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.success && result.data) {
          // If already checked in but not checked out, next action is check-out
          if (result.data.checkInTime && !result.data.checkOutTime) {
            console.log(`Employee ${employeeId} already checked in, next action: check-out`);
            return 'checkOut';
          }
        }
      }
      
      // Default to check-in (first visit of the day)
      console.log(`Employee ${employeeId} not checked in yet, next action: check-in`);
      return 'checkIn';
    } catch (error) {
      console.error('Error determining attendance mode:', error);
      // Default to check-in on error
      return 'checkIn';
    }
  };

  // Handle presensi manual (admin)
  const handleManualAttendance = async () => {
    if (!manualEmployeeId) {
      toast.error("ID Karyawan tidak boleh kosong");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeId: manualEmployeeId,
          mode,
          isManual: true
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Terjadi kesalahan saat mencatat presensi manual');
      }

      await response.json();
      toast.success(`Berhasil mencatat ${mode === 'checkIn' ? 'check in' : 'check out'} manual!`);
      
      setManualEmployeeId("");
      setIsManualDialogOpen(false);
      
      // Refresh data presensi jika karyawan yang di-input adalah user saat ini
      await fetchAttendance();
    } catch (error) {
      console.error("Error recording manual attendance:", error);
      const errorMessage = error instanceof Error ? error.message : 'Gagal mencatat presensi manual';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="typography-h1">Presensi Karyawan</h1>
          <p className="typography-muted mt-2">
            Kelola presensi karyawan dan lihat rekaman presensi hari ini
          </p>
        </div>

        {/* Jam dan Tanggal */}
        <Card className="w-full md:w-auto">
          <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center">
            <div className="flex items-center">
              <Clock className="mr-2 h-5 w-5" />
              <span className="typography-large">{currentTime}</span>
            </div>
            <div className="flex items-center">
              <CalendarIcon className="mr-2 h-5 w-5" />
              <span className="typography-small">{format(date, "EEEE, dd MMMM yyyy", { locale: id })}</span>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Tabs Presensi dan Riwayat */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="attendance">
            <UserCheck className="mr-2 h-4 w-4" />
            Presensi
          </TabsTrigger>
          <TabsTrigger value="list">
            <Clock className="mr-2 h-4 w-4" />
            Daftar Presensi
          </TabsTrigger>
        </TabsList>
        
        {/* Tab Presensi */}
        <TabsContent value="attendance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Informasi Karyawan */}
            <Card>
              <CardHeader>
                <CardTitle className="typography-h3">Informasi Karyawan</CardTitle>
                <CardDescription className="typography-muted">
                  Detail karyawan dan shift yang berlaku hari ini
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                  <div className="py-4 text-center">
                    <div className="flex justify-center items-center space-x-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <p>Memuat informasi karyawan...</p>
                    </div>
                  </div>
                ) : employeeInfo ? (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-sm font-medium">Nama:</div>
                      <div>{employeeInfo.name || '-'}</div>

                      <div className="text-sm font-medium">ID Karyawan:</div>
                      <div>{employeeInfo.id || '-'}</div>

                      <div className="text-sm font-medium">Departemen:</div>
                      <div>{employeeInfo.department === '-' ? '-' : employeeInfo.department}</div>

                      <div className="text-sm font-medium">Shift:</div>
                      <div>
                        <Badge variant="outline">
                          {employeeInfo.shift === '-' ? '-' : employeeInfo.shift}
                        </Badge>
                      </div>

                      <div className="text-sm font-medium">Status:</div>
                      <div>
                        <Badge variant={isCheckedIn ? "default" : "secondary"}>
                          {isCheckedIn ? "Sudah Presensi" : "Sedang Presensi"}
                        </Badge>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-8 text-center">
                    <div className="space-y-4">
                      <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                        <UserCheck className="h-8 w-8 text-gray-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-700">Belum Ada Presensi</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          Lakukan scan wajah untuk memulai presensi.<br />
                          Informasi karyawan akan muncul setelah berhasil check-in.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.location.reload()}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh Halaman
                </Button>
              </CardFooter>
            </Card>
            
            {/* Face Recognition */}
            <Card>
              <CardHeader>
                <CardTitle className="typography-h3">
                  {mode === 'checkIn' ? 'Presensi Masuk' : 'Presensi Pulang'}
                </CardTitle>
                <CardDescription className="typography-muted">
                  {mode === 'checkIn'
                    ? 'Lakukan scan wajah untuk presensi masuk'
                    : 'Lakukan scan wajah untuk presensi pulang'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AttendanceFaceRecognition
                  onSuccessfulRecognition={(employeeId) => handleSuccessfulRecognition(employeeId)}
                  mode={mode}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Tab Daftar Presensi */}
        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="typography-h3">Daftar Presensi Hari Ini</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Summary info */}
              <div className="mb-4 text-sm text-muted-foreground">
                Menampilkan {startIndex + 1}-{Math.min(endIndex, filteredAttendance.length)} dari {filteredAttendance.length} data presensi
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
                        <Filter className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[200px]">
                      <div className="p-2">
                        <div className="mb-2">
                          <label className="text-xs font-medium mb-1 block">Departemen</label>
                          <Select 
                            value={departmentFilter} 
                            onValueChange={setDepartmentFilter}
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
                            value={statusFilter} 
                            onValueChange={setStatusFilter}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Semua" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Semua</SelectItem>
                              <SelectItem value="Divalidasi">Divalidasi</SelectItem>
                              <SelectItem value="Sedang Berlangsung">Sedang Berlangsung</SelectItem>
                              <SelectItem value="PRESENT">Hadir</SelectItem>
                              <SelectItem value="LATE">Terlambat</SelectItem>
                              <SelectItem value="ABSENT">Tidak Hadir</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="mb-2">
                          <label className="text-xs font-medium mb-1 block">Shift</label>
                          <Select 
                            value={shiftFilter} 
                            onValueChange={setShiftFilter}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Semua" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Semua</SelectItem>
                              {shifts.map((shift) => (
                                <SelectItem key={shift} value={shift}>
                                  {shift}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => router.push("/attendance/history")}>
                    <Clock className="mr-2 h-4 w-4" />
                    Lihat Riwayat
                  </Button>
                  <Button variant="outline" onClick={handleExportToExcel}>
                    <FileDown className="mr-2 h-4 w-4" />
                    Export Excel
                  </Button>
                </div>
              </div>
              
              {isLoading ? (
                <div className="flex justify-center items-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2">Memuat data presensi...</span>
                </div>
              ) : (
                <div className="rounded-md border bg-background shadow-sm">
                  <Table>
                    <TableHeader className="bg-muted/50 border-b">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="px-4 py-3 font-semibold text-muted-foreground">ID</TableHead>
                        <TableHead className="px-4 py-3 font-semibold text-muted-foreground">Nama</TableHead>
                        <TableHead className="px-4 py-3 font-semibold text-muted-foreground">Departemen</TableHead>
                        <TableHead className="px-4 py-3 font-semibold text-muted-foreground">Shift</TableHead>
                        <TableHead className="px-4 py-3 font-semibold text-muted-foreground">Jam Masuk</TableHead>
                        <TableHead className="px-4 py-3 font-semibold text-muted-foreground">Jam Keluar</TableHead>
                        <TableHead className="px-4 py-3 font-semibold text-muted-foreground">Istirahat Mulai</TableHead>
                        <TableHead className="px-4 py-3 font-semibold text-muted-foreground">Istirahat Selesai</TableHead>
                        <TableHead className="px-4 py-3 font-semibold text-muted-foreground">Lembur Mulai</TableHead>
                        <TableHead className="px-4 py-3 font-semibold text-muted-foreground">Lembur Selesai</TableHead>
                        <TableHead className="px-4 py-3 font-semibold text-muted-foreground">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedData.length > 0 ? (
                        paginatedData.map((attendance) => {
                          const statusBadge = getStatusBadge(attendance.status);
                          return (
                            <TableRow key={attendance.id}>
                              <TableCell className="px-4 py-3 font-mono text-sm">
                                {attendance.employeeId}
                              </TableCell>
                              <TableCell className="px-4 py-3 font-medium">
                                {attendance.employeeName}
                              </TableCell>
                              <TableCell className="px-4 py-3">{attendance.department}</TableCell>
                              <TableCell className="px-4 py-3">{attendance.shift}</TableCell>
                              <TableCell className="px-4 py-3 font-mono text-sm">
                                {formatTime(attendance.checkInTime)}
                              </TableCell>
                              <TableCell className="px-4 py-3 font-mono text-sm">
                                {formatTime(attendance.checkOutTime)}
                              </TableCell>
                              <TableCell className="px-4 py-3 font-mono text-sm">
                                {formatTime(attendance.breakStartTime)}
                              </TableCell>
                              <TableCell className="px-4 py-3 font-mono text-sm">
                                {formatTime(attendance.breakEndTime)}
                              </TableCell>
                              <TableCell className="px-4 py-3 font-mono text-sm">
                                {formatTime(attendance.overtimeStartTime)}
                              </TableCell>
                              <TableCell className="px-4 py-3 font-mono text-sm">
                                {formatTime(attendance.overtimeEndTime)}
                              </TableCell>
                              <TableCell className="px-4 py-3">
                                <Badge 
                                  variant={statusBadge.variant}
                                  className={statusBadge.className}
                                >
                                  {attendance.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={11} className="text-center h-24">
                            <div className="flex flex-col items-center gap-2">
                              <Users className="h-8 w-8 text-muted-foreground" />
                              <div>
                                <p className="font-medium">Tidak ada data presensi</p>
                                <p className="text-sm text-muted-foreground">
                                  {filteredAttendance.length === 0 && attendanceData.length === 0
                                    ? "Belum ada karyawan yang melakukan presensi hari ini"
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
                    totalItems={filteredAttendance.length}
                    itemsPerPage={pageSize}
                    onPageChange={handlePageChange}
                    onItemsPerPageChange={handlePageSizeChange}
                    itemName="data presensi"
                    showRowsPerPage={true}
                    showFirstLastButtons={true}
                    showPageNumbers={true}
                    className="border-t"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog input manual */}
      <Dialog open={isManualDialogOpen} onOpenChange={setIsManualDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Input Presensi Manual</DialogTitle>
            <DialogDescription>
              Masukkan ID Karyawan untuk mencatat presensi secara manual.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="employeeId" className="text-sm font-medium">
                ID Karyawan
              </label>
              <Input
                id="employeeId"
                value={manualEmployeeId}
                onChange={(e) => setManualEmployeeId(e.target.value)}
                placeholder="Masukkan ID Karyawan"
              />
            </div>
            
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium">Mode:</label>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="checkIn"
                  name="mode"
                  checked={mode === 'checkIn'}
                  onChange={() => setMode('checkIn')}
                />
                <label htmlFor="checkIn">Check In</label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="checkOut"
                  name="mode"
                  checked={mode === 'checkOut'}
                  onChange={() => setMode('checkOut')}
                />
                <label htmlFor="checkOut">Check Out</label>
              </div>
            </div>
            
            <Button 
              className="w-full" 
              onClick={handleManualAttendance}
              disabled={isLoading}
            >
              {isLoading ? "Memproses..." : "Simpan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}