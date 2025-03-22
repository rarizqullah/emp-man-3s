"use client";

import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { id } from "date-fns/locale";
import {
  Search,
  FileDown,
  Calendar as CalendarIcon
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
import { Label } from "@/components/ui/label";

// Tipe data untuk riwayat kehadiran
interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  shift: string;
  checkInTime: string;
  checkOutTime: string | null;
  workingHours: number;
  overtimeHours: number;
  status: string;
  date: string;
}

// Contoh data riwayat kehadiran untuk tampilan
const ATTENDANCE_HISTORY: AttendanceRecord[] = [
  {
    id: "ATT001",
    employeeId: "EMP001",
    employeeName: "Ahmad Fauzi",
    department: "IT",
    shift: "Non-Shift",
    checkInTime: "2024-02-01T08:05:23",
    checkOutTime: "2024-02-01T17:10:45",
    workingHours: 9.08,
    overtimeHours: 1.08,
    status: "Hadir",
    date: "2024-02-01",
  },
  {
    id: "ATT002",
    employeeId: "EMP002",
    employeeName: "Siti Rahayu",
    department: "HR",
    shift: "Shift A",
    checkInTime: "2024-02-01T07:58:12",
    checkOutTime: "2024-02-01T16:05:43",
    workingHours: 8.12,
    overtimeHours: 0.12,
    status: "Hadir",
    date: "2024-02-01",
  },
  {
    id: "ATT003",
    employeeId: "EMP001",
    employeeName: "Ahmad Fauzi",
    department: "IT",
    shift: "Non-Shift",
    checkInTime: "2024-02-02T08:10:05",
    checkOutTime: "2024-02-02T17:05:30",
    workingHours: 8.92,
    overtimeHours: 0.92,
    status: "Hadir",
    date: "2024-02-02",
  },
  {
    id: "ATT004",
    employeeId: "EMP002",
    employeeName: "Siti Rahayu",
    department: "HR",
    shift: "Shift A",
    checkInTime: "2024-02-02T08:00:10",
    checkOutTime: null,
    workingHours: 0,
    overtimeHours: 0,
    status: "Tidak Lengkap",
    date: "2024-02-02",
  },
  {
    id: "ATT005",
    employeeId: "EMP003",
    employeeName: "Budi Santoso",
    department: "Finance",
    shift: "Non-Shift",
    checkInTime: "2024-02-03T08:30:15",
    checkOutTime: "2024-02-03T17:00:20",
    workingHours: 8.5,
    overtimeHours: 0.5,
    status: "Terlambat",
    date: "2024-02-03",
  },
  {
    id: "ATT006",
    employeeId: "EMP001",
    employeeName: "Ahmad Fauzi",
    department: "IT",
    shift: "Non-Shift",
    checkInTime: "2024-02-03T09:15:40",
    checkOutTime: "2024-02-03T17:20:10",
    workingHours: 8.08,
    overtimeHours: 0.33,
    status: "Terlambat",
    date: "2024-02-03",
  },
  {
    id: "ATT007",
    employeeId: "EMP004",
    employeeName: "Dewi Anggraini",
    department: "Marketing",
    shift: "Shift B",
    checkInTime: "2024-02-04T14:02:30",
    checkOutTime: "2024-02-04T22:05:10",
    workingHours: 8.04,
    overtimeHours: 0.08,
    status: "Hadir",
    date: "2024-02-04",
  },
  {
    id: "ATT008",
    employeeId: "EMP005",
    employeeName: "Eko Prasetyo",
    department: "Production",
    shift: "Shift A",
    checkInTime: "2024-02-04T07:55:20",
    checkOutTime: "2024-02-04T16:10:45",
    workingHours: 8.25,
    overtimeHours: 0.18,
    status: "Hadir",
    date: "2024-02-04",
  },
];

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
  const [filterDepartment, setFilterDepartment] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [filteredData, setFilteredData] = useState<AttendanceRecord[]>(ATTENDANCE_HISTORY);

  // Filter data berdasarkan parameter pencarian dan filter
  useEffect(() => {
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);

    const filtered = ATTENDANCE_HISTORY.filter(record => {
      const recordDate = new Date(record.date);
      const matchesMonth = recordDate >= monthStart && recordDate <= monthEnd;

      const matchesSearch =
        record.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.employeeId.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDepartment = filterDepartment === "" || record.department === filterDepartment;
      const matchesStatus = filterStatus === "" || record.status === filterStatus;

      return matchesMonth && matchesSearch && matchesDepartment && matchesStatus;
    });

    setFilteredData(filtered);
  }, [searchTerm, filterDepartment, filterStatus, date]);

  // Handler untuk pergantian bulan pada kalender
  const handleMonthChange = (newDate: Date) => {
    setDate(newDate);
  };

  // Handler untuk ekspor data kehadiran
  const handleExportData = () => {
    console.log("Mengekspor data kehadiran:", filteredData);
    alert("Fungsi ekspor data akan diimplementasikan di sini");
    // TODO: Implementasi ekspor data ke Excel/CSV
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Riwayat Kehadiran</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Riwayat Kehadiran</CardTitle>
          <CardDescription>
            Lihat dan kelola riwayat kehadiran karyawan
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

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-10 gap-1">
                    <CalendarIcon className="h-4 w-4" />
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

              <div className="flex gap-2 w-full sm:w-auto">
                <DropdownFilter
                  label="Departemen"
                  placeholder="Pilih departemen"
                  items={[
                    { value: "", label: "Semua" },
                    { value: "IT", label: "IT" },
                    { value: "HR", label: "HR" },
                    { value: "Finance", label: "Finance" },
                    { value: "Marketing", label: "Marketing" },
                    { value: "Production", label: "Production" },
                  ]}
                  value={filterDepartment}
                  onChange={setFilterDepartment}
                  className="w-full sm:w-[140px]"
                />

                <DropdownFilter
                  label="Status"
                  placeholder="Pilih status"
                  items={[
                    { value: "", label: "Semua" },
                    { value: "Hadir", label: "Hadir" },
                    { value: "Terlambat", label: "Terlambat" },
                    { value: "Tidak Lengkap", label: "Tidak Lengkap" },
                  ]}
                  value={filterStatus}
                  onChange={setFilterStatus}
                  className="w-full sm:w-[140px]"
                />
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
                  <TableHead>Tanggal</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Departemen</TableHead>
                  <TableHead>Shift</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Jam Kerja</TableHead>
                  <TableHead>Lembur</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length > 0 ? (
                  filteredData.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{formatDate(record.date)}</TableCell>
                      <TableCell>{record.employeeId}</TableCell>
                      <TableCell className="font-medium">{record.employeeName}</TableCell>
                      <TableCell>{record.department}</TableCell>
                      <TableCell>{record.shift}</TableCell>
                      <TableCell>{formatTime(record.checkInTime)}</TableCell>
                      <TableCell>{formatTime(record.checkOutTime)}</TableCell>
                      <TableCell>{record.workingHours.toFixed(2)}</TableCell>
                      <TableCell>{record.overtimeHours.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={
                          record.status === "Hadir" ? "default" :
                            record.status === "Terlambat" ? "secondary" : "destructive"
                        }>
                          {record.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center h-24">
                      Tidak ada data kehadiran ditemukan
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Komponen untuk dropdown filter
interface DropdownFilterProps {
  label: string;
  placeholder: string;
  items: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  className: string;
}

function DropdownFilter({
  label,
  placeholder,
  items,
  value,
  onChange,
  className,
}: DropdownFilterProps) {
  return (
    <div className={className}>
      <Label className="mb-2 block text-sm font-semibold">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem
              key={item.value || `item-${item.label}`}
              value={item.value || `default-${item.label}`}
            >
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
} 