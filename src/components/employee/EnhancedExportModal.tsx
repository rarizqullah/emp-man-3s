"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { FileDown, Database, Users, Loader2 } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from 'xlsx';

interface EnhancedExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedEmployees: string[];
  allEmployees: any[];
}

interface ExportField {
  key: string;
  label: string;
  category: 'basic' | 'contact' | 'employment' | 'attendance' | 'financial';
  description: string;
}

const exportFields: ExportField[] = [
  // Basic Information
  { key: 'employeeId', label: 'ID Karyawan', category: 'basic', description: 'Nomor identitas karyawan' },
  { key: 'user.name', label: 'Nama Lengkap', category: 'basic', description: 'Nama lengkap karyawan' },
  { key: 'user.email', label: 'Email', category: 'basic', description: 'Alamat email' },
  { key: 'gender', label: 'Jenis Kelamin', category: 'basic', description: 'Laki-laki/Perempuan' },
  { key: 'address', label: 'Alamat', category: 'contact', description: 'Alamat lengkap' },
  
  // Employment Details
  { key: 'department.name', label: 'Departemen', category: 'employment', description: 'Departemen tempat bekerja' },
  { key: 'subDepartment.name', label: 'Sub Departemen', category: 'employment', description: 'Sub departemen' },
  { key: 'position.name', label: 'Posisi', category: 'employment', description: 'Jabatan/posisi' },
  { key: 'position.level', label: 'Level Posisi', category: 'employment', description: 'Level jabatan' },
  { key: 'shift.name', label: 'Shift', category: 'employment', description: 'Nama shift kerja' },
  { key: 'shift.shiftType', label: 'Tipe Shift', category: 'employment', description: 'Jenis shift (NON_SHIFT/SHIFT_A/SHIFT_B)' },
  
  // Contract Information
  { key: 'contractType', label: 'Tipe Kontrak', category: 'employment', description: 'PERMANENT/TRAINING' },
  { key: 'contractNumber', label: 'Nomor Kontrak', category: 'employment', description: 'Nomor kontrak kerja' },
  { key: 'contractStartDate', label: 'Tanggal Mulai Kontrak', category: 'employment', description: 'Tanggal mulai bekerja' },
  { key: 'contractEndDate', label: 'Tanggal Berakhir Kontrak', category: 'employment', description: 'Tanggal berakhir kontrak' },
  { key: 'warningStatus', label: 'Status Peringatan', category: 'employment', description: 'Status SP (NONE/SP1/SP2/SP3)' },
  
  // System Information
  { key: 'createdAt', label: 'Tanggal Dibuat', category: 'basic', description: 'Tanggal data dibuat' },
  { key: 'updatedAt', label: 'Tanggal Update', category: 'basic', description: 'Tanggal terakhir diupdate' },
];

const fieldCategories = [
  { key: 'basic', label: 'Informasi Dasar', icon: Users },
  { key: 'contact', label: 'Kontak', icon: Users },
  { key: 'employment', label: 'Data Kepegawaian', icon: Database },
] as const;

export function EnhancedExportModal({
  isOpen,
  onClose,
  selectedEmployees,
  allEmployees,
}: EnhancedExportModalProps) {
  const [selectedFields, setSelectedFields] = useState<string[]>([
    'employeeId', 'user.name', 'user.email', 'department.name', 'position.name', 'shift.name', 'contractType'
  ]);
  const [exportMode, setExportMode] = useState<'selected' | 'all' | 'filtered'>('selected');
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv'>('xlsx');
  const [loading, setLoading] = useState(false);

  const handleFieldToggle = (fieldKey: string, checked: boolean) => {
    setSelectedFields(prev => 
      checked 
        ? [...prev, fieldKey]
        : prev.filter(key => key !== fieldKey)
    );
  };

  const handleSelectAllInCategory = (category: string) => {
    const categoryFields = exportFields.filter(field => field.category === category);
    const allCategorySelected = categoryFields.every(field => selectedFields.includes(field.key));
    
    if (allCategorySelected) {
      // Deselect all in category
      setSelectedFields(prev => prev.filter(key => !categoryFields.some(field => field.key === key)));
    } else {
      // Select all in category
      const categoryKeys = categoryFields.map(field => field.key);
      setSelectedFields(prev => {
        const newFields = [...prev];
        categoryKeys.forEach(key => {
          if (!newFields.includes(key)) {
            newFields.push(key);
          }
        });
        return newFields;
      });
    }
  };

  const getFieldValue = (employee: any, fieldKey: string): any => {
    const keys = fieldKey.split('.');
    let value = employee;
    
    for (const key of keys) {
      value = value?.[key];
      if (value === undefined || value === null) {
        return '';
      }
    }
    
    // Format specific fields
    if (fieldKey.includes('Date') && value instanceof Date) {
      return value.toLocaleDateString('id-ID');
    }
    
    if (typeof value === 'string' && value.includes('T')) {
      // Try to parse as date
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('id-ID');
      }
    }
    
    return value || '';
  };

  const handleExport = async () => {
    if (selectedFields.length === 0) {
      toast.error("Pilih minimal satu field untuk diekspor");
      return;
    }

    setLoading(true);

    try {
      // Determine which employees to export
      let employeesToExport: any[] = [];
      
      switch (exportMode) {
        case 'selected':
          if (selectedEmployees.length === 0) {
            toast.error("Tidak ada karyawan yang dipilih");
            return;
          }
          employeesToExport = allEmployees.filter(emp => selectedEmployees.includes(emp.id));
          break;
        case 'all':
          employeesToExport = allEmployees;
          break;
        case 'filtered':
          // TODO: Implement filtered export based on current table filters
          employeesToExport = allEmployees;
          break;
      }

      // Create export data
      const exportData = employeesToExport.map(employee => {
        const rowData: any = {};
        selectedFields.forEach(fieldKey => {
          const field = exportFields.find(f => f.key === fieldKey);
          const label = field?.label || fieldKey;
          rowData[label] = getFieldValue(employee, fieldKey);
        });
        return rowData;
      });

      if (exportData.length === 0) {
        toast.error("Tidak ada data untuk diekspor");
        return;
      }

      // Generate filename
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
      const modeText = exportMode === 'selected' ? 'selected' : exportMode === 'all' ? 'all' : 'filtered';
      const filename = `employees-${modeText}-${timestamp}`;

      // Export based on format
      if (exportFormat === 'xlsx') {
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(exportData);
        
        // Auto-size columns
        const colWidths = selectedFields.map(fieldKey => {
          const field = exportFields.find(f => f.key === fieldKey);
          const label = field?.label || fieldKey;
          const maxLength = Math.max(
            label.length,
            ...exportData.map(row => String(row[label] || '').length)
          );
          return { wch: Math.min(Math.max(maxLength + 2, 10), 50) };
        });
        ws['!cols'] = colWidths;
        
        XLSX.utils.book_append_sheet(wb, ws, 'Employees');
        XLSX.writeFile(wb, `${filename}.xlsx`);
      } else {
        // CSV Export
        const ws = XLSX.utils.json_to_sheet(exportData);
        const csvData = XLSX.utils.sheet_to_csv(ws);
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      toast.success(
        `✅ Export berhasil!`,
        {
          duration: 5000,
          description: `${exportData.length} karyawan berhasil diekspor dengan ${selectedFields.length} field`
        }
      );

      onClose();

    } catch (error) {
      console.error('Export error:', error);
      toast.error(
        "❌ Gagal mengekspor data",
        {
          description: error instanceof Error ? error.message : 'Terjadi kesalahan yang tidak diketahui'
        }
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5 text-blue-500" />
            Enhanced Export
          </DialogTitle>
          <DialogDescription>
            Export data karyawan dengan pilihan field dan format yang dapat disesuaikan
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Export Mode Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Mode Export</Label>
            <Select value={exportMode} onValueChange={(value: 'selected' | 'all' | 'filtered') => setExportMode(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="selected">
                  Karyawan Terpilih ({selectedEmployees.length})
                </SelectItem>
                <SelectItem value="all">
                  Semua Karyawan ({allEmployees.length})
                </SelectItem>
                <SelectItem value="filtered">
                  Berdasarkan Filter Saat Ini
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Export Format */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Format Export</Label>
            <Select value={exportFormat} onValueChange={(value: 'xlsx' | 'csv') => setExportFormat(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="xlsx">Excel (.xlsx) - Recommended</SelectItem>
                <SelectItem value="csv">CSV (.csv)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Field Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Pilih Field untuk Export</Label>
              <div className="text-xs text-muted-foreground">
                {selectedFields.length} dari {exportFields.length} field dipilih
              </div>
            </div>

            {fieldCategories.map((category) => {
              const categoryFields = exportFields.filter(field => field.category === category.key);
              const selectedInCategory = categoryFields.filter(field => selectedFields.includes(field.key)).length;
              const Icon = category.icon;

              return (
                <div key={category.key} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{category.label}</span>
                      <span className="text-xs text-muted-foreground">
                        ({selectedInCategory}/{categoryFields.length})
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleSelectAllInCategory(category.key)}
                    >
                      {selectedInCategory === categoryFields.length ? 'Unselect All' : 'Select All'}
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 gap-3 pl-6">
                    {categoryFields.map((field) => (
                      <div key={field.key} className="flex items-start space-x-3">
                        <Checkbox
                          id={field.key}
                          checked={selectedFields.includes(field.key)}
                          onChange={(e) => handleFieldToggle(field.key, e.target.checked)}
                        />
                        <div className="space-y-1 leading-none">
                          <Label
                            htmlFor={field.key}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {field.label}
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            {field.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Batal
          </Button>
          <Button onClick={handleExport} disabled={loading || selectedFields.length === 0}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Mengekspor...
              </>
            ) : (
              <>
                <FileDown className="mr-2 h-4 w-4" />
                Export {exportFormat.toUpperCase()}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 