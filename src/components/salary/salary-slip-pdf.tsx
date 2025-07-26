"use client";

import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

interface SalarySlipPDFProps {
  salaryId: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  size?: "sm" | "default" | "lg";
  disabled?: boolean;
}

export function SalarySlipPDF({ 
  salaryId, 
  variant = "outline",
  size = "sm",
  disabled = false
}: SalarySlipPDFProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = async () => {
    try {
      setIsGenerating(true);
      
      // Fetch salary slip data
      const response = await fetch(`/api/salaries/${salaryId}?export=pdf`);
      
      if (!response.ok) {
        throw new Error('Gagal mengambil data slip gaji');
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Gagal mengambil data slip gaji');
      }
      
      const slipData = result.data;
      
      // Generate PDF
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      // Set font untuk Unicode support
      doc.setFont('helvetica');
      
      // Header perusahaan
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('SLIP GAJI KARYAWAN', 105, 20, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('PT. Employee Management System', 105, 30, { align: 'center' });
      
      // Garis pemisah
      doc.line(15, 35, 195, 35);
      
      // Data Karyawan
      let yPos = 50;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('DATA KARYAWAN', 15, yPos);
      
      yPos += 10;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      const employeeData = [
        ['NIK', ':', slipData.employee.employeeId],
        ['Nama', ':', slipData.employee.name],
        ['Email', ':', slipData.employee.email],
        ['Departemen', ':', slipData.employee.department],
        ['Posisi', ':', slipData.employee.position],
        ['Status Kontrak', ':', slipData.employee.contractType],
        ['No. Rekening', ':', slipData.employee.bankAccountNumber || '-']
      ];
      
      employeeData.forEach(([label, colon, value]) => {
        doc.text(label, 15, yPos);
        doc.text(colon, 55, yPos);
        doc.text(value, 60, yPos);
        yPos += 6;
      });
      
      // Periode Gaji
      yPos += 5;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('PERIODE GAJI', 15, yPos);
      
      yPos += 10;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Periode', 15, yPos);
      doc.text(':', 55, yPos);
      doc.text(`${slipData.period.start} - ${slipData.period.end}`, 60, yPos);
      
      yPos += 6;
      doc.text('Bulan/Tahun', 15, yPos);
      doc.text(':', 55, yPos);
      doc.text(slipData.period.month, 60, yPos);
      
      // Rekap Jam Kerja
      yPos += 15;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('REKAP JAM KERJA', 15, yPos);
      
      yPos += 10;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      const workHoursData = [
        ['Jam Kerja Utama', ':', `${slipData.workHours.mainHours} jam`],
        ['Jam Lembur Reguler', ':', `${slipData.workHours.regularOvertimeHours} jam`],
        ['Jam Lembur Mingguan', ':', `${slipData.workHours.weeklyOvertimeHours} jam`],
        ['Total Jam Kerja', ':', `${slipData.workHours.totalHours} jam`]
      ];
      
      workHoursData.forEach(([label, colon, value]) => {
        doc.text(label, 15, yPos);
        doc.text(colon, 70, yPos);
        doc.text(value, 75, yPos);
        yPos += 6;
      });
      
      // Rincian Pendapatan
      yPos += 15;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('RINCIAN PENDAPATAN', 15, yPos);
      
      yPos += 10;
      doc.setFontSize(10);
      
      // Header tabel pendapatan
      doc.setFont('helvetica', 'bold');
      doc.text('Keterangan', 15, yPos);
      doc.text('Jam', 80, yPos);
      doc.text('Tarif/Jam', 110, yPos);
      doc.text('Jumlah', 160, yPos, { align: 'right' });
      
      yPos += 3;
      doc.line(15, yPos, 195, yPos);
      yPos += 7;
      
      doc.setFont('helvetica', 'normal');
      
      // Gaji Pokok
      doc.text('Gaji Pokok', 15, yPos);
      doc.text(slipData.earningsDetails.baseSalary.hours.toString(), 80, yPos);
      doc.text(slipData.earningsDetails.baseSalary.rate.toLocaleString('id-ID'), 110, yPos);
      doc.text(slipData.formatted.baseSalary, 195, yPos, { align: 'right' });
      yPos += 6;
      
      // Lembur Reguler
      if (slipData.earningsDetails.regularOvertime.hours > 0) {
        doc.text('Lembur Reguler', 15, yPos);
        doc.text(slipData.earningsDetails.regularOvertime.hours.toString(), 80, yPos);
        doc.text(slipData.earningsDetails.regularOvertime.rate.toLocaleString('id-ID'), 110, yPos);
        doc.text(slipData.formatted.overtimeSalary, 195, yPos, { align: 'right' });
        yPos += 6;
      }
      
      // Lembur Mingguan
      if (slipData.earningsDetails.weeklyOvertime.hours > 0) {
        doc.text('Lembur Mingguan', 15, yPos);
        doc.text(slipData.earningsDetails.weeklyOvertime.hours.toString(), 80, yPos);
        doc.text(slipData.earningsDetails.weeklyOvertime.rate.toLocaleString('id-ID'), 110, yPos);
        doc.text(slipData.formatted.weeklyOvertimeSalary, 195, yPos, { align: 'right' });
        yPos += 6;
      }        // Tunjangan
        if (slipData.allowances.length > 0) {
          slipData.allowances.forEach((allowance: { type: string; amount: number }) => {
          doc.text(`Tunjangan ${allowance.type}`, 15, yPos);
          doc.text('-', 80, yPos);
          doc.text('-', 110, yPos);
          doc.text(allowance.amount.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }), 195, yPos, { align: 'right' });
          yPos += 6;
        });
      }
      
      // Garis subtotal
      yPos += 3;
      doc.line(15, yPos, 195, yPos);
      yPos += 7;
      
      // Subtotal
      doc.setFont('helvetica', 'bold');
      doc.text('SUBTOTAL PENDAPATAN', 15, yPos);
      doc.text(slipData.formatted.grossSalary, 195, yPos, { align: 'right' });
      
      // Total Gaji Bersih
      yPos += 15;
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('TOTAL GAJI BERSIH', 15, yPos);
      doc.text(slipData.formatted.totalSalary, 195, yPos, { align: 'right' });
      
      // Garis tebal untuk total
      yPos += 5;
      doc.setLineWidth(2);
      doc.line(15, yPos, 195, yPos);
      doc.setLineWidth(0.5);
      
      // Status Pembayaran
      yPos += 15;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('STATUS PEMBAYARAN', 15, yPos);
      
      yPos += 8;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Status', 15, yPos);
      doc.text(':', 55, yPos);
      
      // Warna untuk status
      if (slipData.paymentStatus === 'Dibayar') {
        doc.setTextColor(0, 128, 0); // Green
      } else {
        doc.setTextColor(255, 0, 0); // Red
      }
      doc.text(slipData.paymentStatus, 60, yPos);
      doc.setTextColor(0, 0, 0); // Reset to black
      
      if (slipData.paymentDate) {
        yPos += 6;
        doc.text('Tanggal Bayar', 15, yPos);
        doc.text(':', 55, yPos);
        doc.text(slipData.paymentDate, 60, yPos);
      }
      
      // Tanggal Dibuat
      yPos += 15;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('TANGGAL DIBUAT', 15, yPos);
      
      yPos += 8;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Dibuat', 15, yPos);
      doc.text(':', 55, yPos);
      doc.text(slipData.dates.created, 60, yPos);
      
      // Footer
      yPos = 280;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text('Dokumen ini dibuat secara otomatis oleh sistem Employee Management', 105, yPos, { align: 'center' });
      doc.text(`Dicetak pada: ${new Date().toLocaleDateString('id-ID')} ${new Date().toLocaleTimeString('id-ID')}`, 105, yPos + 5, { align: 'center' });
      
      // Save PDF
      const fileName = `Slip_Gaji_${slipData.employee.name.replace(/\s+/g, '_')}_${slipData.period.month.replace(/\s+/g, '_')}.pdf`;
      doc.save(fileName);
      
      toast.success('Slip gaji PDF berhasil digenerate');
      
    } catch (error) {
      console.error('Error generating salary slip PDF:', error);
      toast.error('Gagal membuat slip gaji PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      disabled={disabled || isGenerating}
      onClick={generatePDF}
    >
      {isGenerating ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : (
        <FileDown className="h-4 w-4 mr-2" />
      )}
      {isGenerating ? 'Membuat PDF...' : 'Cetak Slip PDF'}
    </Button>
  );
}
