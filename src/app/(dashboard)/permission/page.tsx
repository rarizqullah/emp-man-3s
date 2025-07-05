"use client";

import { useState, useEffect, useRef } from "react";
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
  FileText,
  Download,
  Trash2
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
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState<EmployeePermission | null>(null);
  
  // PDF ref
  const detailRef = useRef<HTMLDivElement>(null);
  
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
        console.log('Fetching employees from /api/employees-public...');
        
        const response = await fetch('/api/employees-public', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          cache: "no-store"
        });
        
        console.log('Employees response status:', response.status);
        
        if (response.ok) {
          const result = await response.json();
          console.log('Employees data:', result);
          
          // Check if result has employees array
          if (result.employees && Array.isArray(result.employees)) {
            const employeesList = result.employees.map((emp: any) => ({
              id: emp.id,
              employeeId: emp.employeeId,
              name: emp.name,
              department: emp.department,
              position: emp.position
            }));
            
            setEmployees(employeesList);
            console.log('Employees set successfully:', employeesList.length);
          } else {
            console.warn('Unexpected employees data structure:', result);
            setEmployees([]);
          }
        } else {
          const errorText = await response.text();
          console.error("Failed to fetch employees:", response.status, errorText);
          setEmployees([]);
          toast.error(`Gagal mengambil data karyawan: ${response.status}`);
        }
      } catch (error) {
        console.error("Error fetching employees:", error);
        setEmployees([]);
        toast.error("Terjadi kesalahan saat mengambil data karyawan");
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
    
    // Validasi tanggal
    if (new Date(endDate) < new Date(startDate)) {
      toast.error("Tanggal selesai tidak boleh lebih awal dari tanggal mulai");
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      console.log('Submitting permission with data:', {
        employeeId: selectedEmployee,
        type: permissionType,
        startDate,
        endDate,
        reason,
        otherDetails
      });
      
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
      
      console.log('Permission submission response status:', response.status);
      
      const result = await response.json();
      console.log('Permission submission result:', result);
      
      if (result.success) {
        toast.success(result.message || "Pengajuan izin/cuti berhasil");
        setPermissions(prev => [result.data, ...prev]);
        setIsSubmitDialogOpen(false);
        resetForm();
      } else {
        const errorMessage = result.error || "Gagal mengajukan izin/cuti";
        console.error('Permission submission failed:', result);
        toast.error(errorMessage);
        
        // Show detailed error if available
        if (result.details && Array.isArray(result.details)) {
          result.details.forEach((detail: any) => {
            toast.error(`${detail.field}: ${detail.message}`);
          });
        }
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
  
  // Export to PDF dengan format sesuai template Surat Peringatan
  const handleExportPDF = async () => {
    if (!selectedPermission) return;
    
    try {
      toast.info("Sedang mempersiapkan PDF...");
      
      // Dynamic import for client-side only  
      const jsPDF = await import('jspdf').then(mod => mod.default);
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      let yPosition = margin;
      
      // Header dengan logo dan company info (mirip template)
      // Logo placeholder (kotak abu-abu dengan inisial SSS)
      pdf.setFillColor(220, 220, 220);
      pdf.rect(margin, yPosition, 30, 20, 'F');
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('SSS', margin + 12, yPosition + 12);
      
      // Company name dan alamat (sejajar dengan logo)
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('PT SEKAWAN SAHABAT SEJATI', margin + 40, yPosition + 8);
      
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Jl. Raya Kalibening No.15, Kalibening, Kec. Diwek,', margin + 40, yPosition + 14);
      pdf.text('Kabupaten Jombang, Jawa Timur 61471', margin + 40, yPosition + 18);
      
      // Line separator (ganda seperti template)
      yPosition += 25;
      pdf.setLineWidth(0.5);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      pdf.setLineWidth(1.2);
      pdf.line(margin, yPosition + 2, pageWidth - margin, yPosition + 2);
      
      yPosition += 15;
      
      // Title - SURAT PERMOHONAN IZIN/CUTI (bold dan besar)
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      const title = 'SURAT PERMOHONAN IZIN/CUTI';
      const titleWidth = pdf.getTextWidth(title);
      pdf.text(title, (pageWidth - titleWidth) / 2, yPosition);
      
      yPosition += 15;
      
      // Tabel header info (mirip template tapi untuk izin)
      const headerTableY = yPosition;
      const leftColWidth = 50;
      const rightColWidth = contentWidth - leftColWidth;
      
      // Outer border
      pdf.setLineWidth(0.5);
      pdf.rect(margin, headerTableY, contentWidth, 32);
      
      // Vertical line di tengah
      pdf.line(margin + leftColWidth, headerTableY, margin + leftColWidth, headerTableY + 32);
      
      // Horizontal lines
      pdf.line(margin, headerTableY + 8, pageWidth - margin, headerTableY + 8);
      pdf.line(margin, headerTableY + 16, pageWidth - margin, headerTableY + 16);
      pdf.line(margin, headerTableY + 24, pageWidth - margin, headerTableY + 24);
      
      // Header table content
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      
      // Left column labels
      pdf.text('TINGKAT:', margin + 2, headerTableY + 6);
      pdf.text('No. Surat:', margin + 2, headerTableY + 14);
      pdf.text('Tanggal:', margin + 2, headerTableY + 22);
      pdf.text('Kepada:', margin + 2, headerTableY + 30);
      
      // Right column values
      pdf.setFont('helvetica', 'normal');
      pdf.text('Permohonan Izin/Cuti', margin + leftColWidth + 2, headerTableY + 6);
      
      const docNumber = `${selectedPermission.typeLabel.toUpperCase()}/${format(new Date(), 'yyyy/MM/dd')}/${selectedPermission.id.slice(-4)}`;
      pdf.text(docNumber, margin + leftColWidth + 2, headerTableY + 14);
      
      const today = format(new Date(), 'dd MMMM yyyy');
      pdf.text(today, margin + leftColWidth + 2, headerTableY + 22);
      
      pdf.text('HRD PT. Sekawan Sahabat Sejati', margin + leftColWidth + 2, headerTableY + 30);
      
      yPosition = headerTableY + 40;
      
      // Data Karyawan table (format seperti template)
      const empTableY = yPosition;
      const empTableHeight = 48;
      
      // Outer border
      pdf.rect(margin, empTableY, contentWidth, empTableHeight);
      
      // Vertical line di tengah
      pdf.line(margin + leftColWidth, empTableY, margin + leftColWidth, empTableY + empTableHeight);
      
      // Horizontal lines untuk baris
      const rowHeight = 8;
      for (let i = 1; i < 6; i++) {
        pdf.line(margin, empTableY + (i * rowHeight), pageWidth - margin, empTableY + (i * rowHeight));
      }
      
      // Employee data
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      
      const empData = [
        ['Nama Lengkap:', selectedPermission.employee.name],
        ['NPK/NIK:', selectedPermission.employee.employeeId || '-'],
        ['Jabatan:', selectedPermission.employee.position || '-'],
        ['Bagian/Departemen:', selectedPermission.employee.department || '-'],
        ['Jenis Izin:', selectedPermission.typeLabel],
        ['Status:', selectedPermission.statusLabel]
      ];
      
      empData.forEach((row, index) => {
        const yPos = empTableY + ((index + 1) * rowHeight) - 2;
        pdf.setFont('helvetica', 'bold');
        pdf.text(row[0], margin + 2, yPos);
        pdf.setFont('helvetica', 'normal');
        pdf.text(row[1], margin + leftColWidth + 2, yPos);
      });
      
      yPosition = empTableY + empTableHeight + 15;
      
      // Detail Permohonan section
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('DETAIL PERMOHONAN IZIN/CUTI', margin, yPosition);
      yPosition += 8;
      
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      
      // Format tanggal dengan durasi
      const startDate = formatDate(selectedPermission.startDate);
      const endDate = formatDate(selectedPermission.endDate);
      const duration = selectedPermission.duration;
      
      pdf.text(`Tanggal mulai: ${startDate}`, margin, yPosition);
      yPosition += 6;
      pdf.text(`Tanggal selesai: ${endDate}`, margin, yPosition);
      yPosition += 6;
      pdf.text(`Durasi: ${duration} hari`, margin, yPosition);
      yPosition += 10;
      
      // Alasan permohonan
      pdf.setFont('helvetica', 'bold');
      pdf.text('ALASAN PERMOHONAN:', margin, yPosition);
      yPosition += 6;
      
      pdf.setFont('helvetica', 'normal');
      const reasonLines = pdf.splitTextToSize(selectedPermission.reason, contentWidth - 10);
      reasonLines.forEach((line: string) => {
        pdf.text(line, margin, yPosition);
        yPosition += 5;
      });
      
      // Detail tambahan jika ada
      if (selectedPermission.otherDetails) {
        yPosition += 5;
        pdf.setFont('helvetica', 'bold');
        pdf.text('KETERANGAN TAMBAHAN:', margin, yPosition);
        yPosition += 6;
        
        pdf.setFont('helvetica', 'normal');
        const detailLines = pdf.splitTextToSize(selectedPermission.otherDetails, contentWidth - 10);
        detailLines.forEach((line: string) => {
          pdf.text(line, margin, yPosition);
          yPosition += 5;
        });
      }
      
      yPosition += 15;
      
      // Status persetujuan (jika ada)
      if (selectedPermission.approvedBy) {
        pdf.setFont('helvetica', 'bold');
        pdf.text('STATUS PERSETUJUAN:', margin, yPosition);
        yPosition += 6;
        
        pdf.setFont('helvetica', 'normal');
        const approvalStatus = selectedPermission.status === 'APPROVED' ? 'DISETUJUI' : 'DITOLAK';
        pdf.text(`Status: ${approvalStatus}`, margin, yPosition);
        yPosition += 5;
        pdf.text(`Oleh: ${selectedPermission.approvedBy}`, margin, yPosition);
        yPosition += 5;
        
        if (selectedPermission.approvedAt) {
          pdf.text(`Tanggal: ${formatDateTime(selectedPermission.approvedAt)}`, margin, yPosition);
          yPosition += 5;
        }
        
        if (selectedPermission.rejectionReason) {
          yPosition += 3;
          pdf.text(`Alasan penolakan: ${selectedPermission.rejectionReason}`, margin, yPosition);
          yPosition += 5;
        }
        
        yPosition += 15;
      }
      
      // Check if need new page for signatures
      if (yPosition > pageHeight - 80) {
        pdf.addPage();
        yPosition = margin;
      }
      
      // Signature section (4 kolom seperti template)
      const signatureY = yPosition;
      const colWidth = contentWidth / 4;
      
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      
      // Column headers
      const signatureHeaders = [
        'Pemohon',
        'Mengetahui,\nSupervisor',
        'Disetujui,\nKepala Bagian',
        'Diketahui,\nHRD'
      ];
      
      signatureHeaders.forEach((header, index) => {
        const x = margin + (index * colWidth);
        const headerLines = header.split('\n');
        
        headerLines.forEach((line, lineIndex) => {
          pdf.text(line, x + 5, signatureY + 5 + (lineIndex * 5));
        });
      });
      
      // Signature boxes and lines
      pdf.setLineWidth(0.3);
      for (let i = 0; i < 4; i++) {
        const x = margin + (i * colWidth);
        
        // Box untuk signature
        pdf.rect(x, signatureY + 15, colWidth - 5, 25);
        
        // Line untuk tanda tangan
        pdf.line(x + 5, signatureY + 35, x + colWidth - 10, signatureY + 35);
        
        // Label di bawah
        if (i === 0) {
          pdf.text(selectedPermission.employee.name, x + 5, signatureY + 50);
        } else {
          pdf.text('(...............................)', x + 5, signatureY + 50);
        }
      }
      
      yPosition = signatureY + 65;
      
      // Catatan kaki
      if (yPosition > pageHeight - 25) {
        pdf.addPage();
        yPosition = margin;
      }
      
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'italic');
      pdf.text('Catatan: Surat permohonan ini harus dikembalikan ke HRD setelah disetujui.', margin, yPosition);
      
      // Footer
      yPosition = pageHeight - 15;
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'italic');
      const footerText = `Dokumen dibuat secara otomatis pada ${formatDateTime(new Date().toISOString())} | PT. Sekawan Sahabat Sejati`;
      const footerWidth = pdf.getTextWidth(footerText);
      pdf.text(footerText, (pageWidth - footerWidth) / 2, yPosition);
      
      // Save PDF dengan naming yang sesuai
      const typePrefix = selectedPermission.type === 'SICK_LEAVE' ? 'SAKIT' : 
                        selectedPermission.type === 'ANNUAL_LEAVE' ? 'CUTI' : 'IZIN';
      const fileName = `SURAT_${typePrefix}_${selectedPermission.employee.employeeId}_${format(new Date(selectedPermission.startDate), 'yyyyMMdd')}.pdf`;
      pdf.save(fileName);
      
      toast.success("PDF berhasil diunduh");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Gagal menggenerate PDF: " + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };
  
  // Delete permission
  const handleDeletePermission = async () => {
    if (!selectedPermission) return;
    
    try {
      setIsSubmitting(true);
      
      const response = await fetch(`/api/employee-permissions/${selectedPermission.id}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success("Izin berhasil dihapus");
        setPermissions(prev => prev.filter(p => p.id !== selectedPermission.id));
        setIsDeleteDialogOpen(false);
        setIsDetailDialogOpen(false);
      } else {
        toast.error(result.error || "Gagal menghapus izin");
      }
    } catch (error) {
      console.error("Error deleting permission:", error);
      toast.error("Terjadi kesalahan saat menghapus izin");
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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="typography-h1">Kelola Izin & Cuti</h1>
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
                    {employees.length === 0 ? (
                      <SelectItem value="" disabled>
                        Tidak ada data karyawan
                      </SelectItem>
                    ) : (
                      employees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.name} ({employee.employeeId}) - {employee.department?.name || 'Tidak Ada Departemen'}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {employees.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Memuat data karyawan...
                  </p>
                )}
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
              <Button 
                onClick={handleSubmitPermission} 
                disabled={isSubmitting || !selectedEmployee || !reason.trim()}
              >
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
                      {permissions.length === 0 ? "Belum ada data izin/cuti yang diajukan" : "Tidak ada data yang sesuai dengan filter"}
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
            <div ref={detailRef} className="grid gap-4 py-4">
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
                  <div className="mt-1">
                    <Badge variant={getTypeBadgeVariant(selectedPermission.type)}>
                      {selectedPermission.typeLabel}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <div className="mt-1">
                    <Badge variant={getStatusBadgeVariant(selectedPermission.status)}>
                      {selectedPermission.statusLabel}
                    </Badge>
                  </div>
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
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between">
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={() => {
                  setIsDeleteDialogOpen(true);
                }}
                disabled={isSubmitting}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Hapus Izin
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={handleExportPDF}
                disabled={isSubmitting}
              >
                <Download className="mr-2 h-4 w-4" />
                Export PDF
              </Button>
              <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
                Tutup
              </Button>
            </div>
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

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Izin/Cuti</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus izin/cuti untuk {selectedPermission?.employee.name}?
              <br />
              <span className="text-destructive font-medium">
                Tindakan ini tidak dapat dibatalkan.
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-destructive/10 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="text-destructive">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-destructive">Konfirmasi Penghapusan</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Data izin/cuti yang dihapus tidak dapat dipulihkan. Pastikan Anda benar-benar ingin menghapus data ini.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDeletePermission} 
              disabled={isSubmitting}
            >
              {isSubmitting ? "Menghapus..." : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
