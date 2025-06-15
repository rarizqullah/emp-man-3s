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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

export default function UpdatedSalaryPage() {
  // State management
  const [activeTab, setActiveTab] = useState("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterDepartment, setFilterDepartment] = useState("");
  
  // Data state
  const [salaries, setSalaries] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingOpen, setIsGeneratingOpen] = useState(false);

  // Fetch salaries
  const fetchSalaries = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/salaries');
      if (response.ok) {
        const result = await response.json();
        setSalaries(result.data || []);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Gagal memuat data gaji');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSalaries();
  }, []);

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
              <div className="flex justify-between mb-4">
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari karyawan..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
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
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center h-24">
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
                <Select>
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
                <Select>
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
            <Button onClick={() => {
              toast.success('Fitur perhitungan gaji akan segera tersedia');
              setIsGeneratingOpen(false);
            }}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Hitung Gaji
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 