"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { 
  Search, 
  Plus, 
  RefreshCw, 
  Edit, 
  Trash2, 
  MoreHorizontal,
  Calculator
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { DataTablePagination } from "@/components/ui/data-table-pagination";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Interface untuk allowance
interface Allowance {
  id: string;
  name: string;
  description?: string;
  applicableRule: string;
  umkAmount?: number;
  companyPercentage?: number;
  employeePercentage?: number;
  companyAmount?: number;
  employeeAmount?: number;
  createdAt: string;
  updatedAt: string;
  _count?: {
    employeeAllowances: number;
  };
}

// Schema validasi untuk form allowance
const allowanceFormSchema = z.object({
  name: z.string().min(1, { message: "Nama tunjangan wajib diisi" }),
  description: z.string().optional(),
  applicableRule: z.string().min(1, { message: "Aturan berlaku wajib diisi" }),
  umkAmount: z.coerce.number().min(0, { message: "Jumlah UMK harus minimal 0" }).optional(),
  companyPercentage: z.coerce.number().min(0).max(100, { message: "Persentase perusahaan harus antara 0-100" }).optional(),
  employeePercentage: z.coerce.number().min(0).max(100, { message: "Persentase karyawan harus antara 0-100" }).optional(),
});

type AllowanceFormValues = z.infer<typeof allowanceFormSchema>;

// Schema untuk bulk edit
const bulkEditSchema = z.object({
  umkAmount: z.coerce.number().min(0, { message: "Jumlah UMK harus minimal 0" }).optional(),
  companyPercentage: z.coerce.number().min(0).max(100, { message: "Persentase perusahaan harus antara 0-100" }).optional(),
  employeePercentage: z.coerce.number().min(0).max(100, { message: "Persentase karyawan harus antara 0-100" }).optional(),
});

type BulkEditFormValues = z.infer<typeof bulkEditSchema>;

// Format mata uang
const formatCurrency = (amount?: number | null) => {
  if (!amount) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
};

export default function AllowancesPage() {
  const [allowances, setAllowances] = useState<Allowance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // State untuk modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [bulkEditModalOpen, setBulkEditModalOpen] = useState(false);
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
  const [selectedAllowance, setSelectedAllowance] = useState<Allowance | null>(null);
  
  // State untuk loading operations
  const [bulkEditLoading, setBulkEditLoading] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  // State untuk multiple selection
  const [selectedAllowances, setSelectedAllowances] = useState<string[]>([]);

  // State untuk pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  // Form untuk tambah/edit allowance
  const form = useForm<AllowanceFormValues>({
    resolver: zodResolver(allowanceFormSchema),
    defaultValues: {
      name: "",
      description: "",
      applicableRule: "",
      umkAmount: 0,
      companyPercentage: 0,
      employeePercentage: 0,
    },
  });

  // Form untuk bulk edit
  const bulkEditForm = useForm<BulkEditFormValues>({
    resolver: zodResolver(bulkEditSchema),
    defaultValues: {
      umkAmount: undefined,
      companyPercentage: undefined,
      employeePercentage: undefined,
    },
  });

  // Fetch data allowances
  const fetchAllowances = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/allowances');
      
      if (!response.ok) {
        throw new Error('Gagal mengambil data tunjangan');
      }
      
      const data = await response.json();
      setAllowances(data);
    } catch (error) {
      console.error('Error fetching allowances:', error);
      toast.error('Gagal memuat data tunjangan');
      setAllowances([]);
    } finally {
      setLoading(false);
    }
  };

  // Load data saat komponen dimount
  useEffect(() => {
    fetchAllowances();
  }, []);

  // Filter allowances berdasarkan pencarian
  const filteredAllowances = allowances.filter(allowance =>
    allowance.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (allowance.description && allowance.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    allowance.applicableRule.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination logic
  const totalItems = filteredAllowances.length;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedAllowances = filteredAllowances.slice(startIndex, endIndex);

  // Update total pages when filtered allowances change
  useEffect(() => {
    const newTotalPages = Math.ceil(filteredAllowances.length / itemsPerPage);
    setTotalPages(newTotalPages);
    
    // Reset to first page if current page is beyond total pages
    if (currentPage > newTotalPages && newTotalPages > 0) {
      setCurrentPage(1);
    }
  }, [filteredAllowances.length, itemsPerPage, currentPage]);

  // Handle multiple selection
  const handleSelectAllowance = (allowanceId: string, checked: boolean) => {
    if (checked) {
      setSelectedAllowances(prev => [...prev, allowanceId]);
    } else {
      setSelectedAllowances(prev => prev.filter(id => id !== allowanceId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    const currentPageIds = paginatedAllowances.map(allowance => allowance.id);
    
    if (checked) {
      // Select all allowances in current page
      setSelectedAllowances(prev => {
        const newSelection = [...prev];
        currentPageIds.forEach(id => {
          if (!newSelection.includes(id)) {
            newSelection.push(id);
          }
        });
        return newSelection;
      });
    } else {
      // Deselect all allowances in current page
      setSelectedAllowances(prev => prev.filter(id => !currentPageIds.includes(id)));
    }
  };

  // Handler untuk menambah allowance
  const handleAddAllowance = async (data: AllowanceFormValues) => {
    try {
      const response = await fetch('/api/allowances', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Gagal menambahkan tunjangan');
      }

      toast.success('Tunjangan berhasil ditambahkan');
      fetchAllowances();
      setAddModalOpen(false);
      form.reset();
    } catch (error: unknown) {
      console.error('Error adding allowance:', error);
      const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan saat menambahkan tunjangan';
      toast.error(errorMessage);
    }
  };

  // Handler untuk edit allowance
  const handleEditAllowance = (allowance: Allowance) => {
    setSelectedAllowance(allowance);
    form.setValue('name', allowance.name);
    form.setValue('description', allowance.description || '');
    form.setValue('applicableRule', allowance.applicableRule);
    form.setValue('umkAmount', allowance.umkAmount || 0);
    form.setValue('companyPercentage', allowance.companyPercentage || 0);
    form.setValue('employeePercentage', allowance.employeePercentage || 0);
    setEditModalOpen(true);
  };

  // Handler untuk update allowance
  const handleUpdateAllowance = async (data: AllowanceFormValues) => {
    if (!selectedAllowance) return;

    try {
      const response = await fetch(`/api/allowances/${selectedAllowance.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Gagal mengupdate tunjangan');
      }

      toast.success('Tunjangan berhasil diperbarui');
      fetchAllowances();
      setEditModalOpen(false);
      setSelectedAllowance(null);
      form.reset();
    } catch (error: unknown) {
      console.error('Error updating allowance:', error);
      const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan saat mengupdate tunjangan';
      toast.error(errorMessage);
    }
  };

  // Handler untuk bulk edit
  const handleBulkEdit = async (data: BulkEditFormValues) => {
    try {
      setBulkEditLoading(true);
      
      // Filter hanya nilai yang tidak undefined
      const updates: {
        umkAmount?: number;
        companyPercentage?: number;
        employeePercentage?: number;
      } = {};
      if (data.umkAmount !== undefined && data.umkAmount !== null) {
        updates.umkAmount = data.umkAmount;
      }
      if (data.companyPercentage !== undefined && data.companyPercentage !== null) {
        updates.companyPercentage = data.companyPercentage;
      }
      if (data.employeePercentage !== undefined && data.employeePercentage !== null) {
        updates.employeePercentage = data.employeePercentage;
      }

      // Validasi bahwa minimal ada satu field yang diisi
      if (Object.keys(updates).length === 0) {
        toast.error('Silakan isi minimal satu field untuk diupdate');
        return;
      }

      const response = await fetch('/api/allowances/bulk-edit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          allowanceIds: selectedAllowances,
          updates
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle specific error cases
        if (result.notFoundIds && result.notFoundIds.length > 0) {
          toast.error(`Beberapa tunjangan tidak ditemukan. Silakan refresh halaman.`);
        } else {
          toast.error(result.error || 'Gagal mengupdate tunjangan');
        }
        return;
      }

      toast.success(result.message || `${result.updatedCount} tunjangan berhasil diupdate`);
      fetchAllowances();
      setBulkEditModalOpen(false);
      setSelectedAllowances([]);
      bulkEditForm.reset();
    } catch (error: unknown) {
      console.error('Error bulk editing allowances:', error);
      const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan saat mengupdate tunjangan';
      toast.error(errorMessage);
    } finally {
      setBulkEditLoading(false);
    }
  };

  // Handler untuk bulk delete
  const handleBulkDelete = async () => {
    if (selectedAllowances.length === 0) {
      toast.error('Pilih minimal satu tunjangan untuk dihapus');
      return;
    }

    try {
      setBulkDeleteLoading(true);
      
      const response = await fetch('/api/allowances/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          allowanceIds: selectedAllowances
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle specific error cases
        if (result.allowancesInUse && result.allowancesInUse.length > 0) {
          const allowanceList = result.allowancesInUse
            .map((allowance: { name: string; employeeCount: number }) => `${allowance.name} (${allowance.employeeCount} karyawan)`)
            .join(', ');
          toast.error(`Tidak dapat menghapus tunjangan yang masih digunakan: ${allowanceList}`);
        } else if (result.notFoundIds && result.notFoundIds.length > 0) {
          toast.error(`Beberapa tunjangan tidak ditemukan. Silakan refresh halaman.`);
        } else {
          toast.error(result.error || 'Gagal menghapus tunjangan');
        }
        return;
      }

      toast.success(result.message || `${result.deletedCount} tunjangan berhasil dihapus`);
      fetchAllowances();
      setBulkDeleteModalOpen(false);
      setSelectedAllowances([]);
    } catch (error: unknown) {
      console.error('Error bulk deleting allowances:', error);
      const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan saat menghapus tunjangan';
      toast.error(errorMessage);
    } finally {
      setBulkDeleteLoading(false);
    }
  };
  const handleDeleteAllowance = async () => {
    if (!selectedAllowance) return;

    try {
      const response = await fetch(`/api/allowances/${selectedAllowance.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Gagal menghapus tunjangan');
      }

      toast.success('Tunjangan berhasil dihapus');
      fetchAllowances();
      setDeleteModalOpen(false);
      setSelectedAllowance(null);
    } catch (error: unknown) {
      console.error('Error deleting allowance:', error);
      const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan saat menghapus tunjangan';
      toast.error(errorMessage);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="typography-h1">Konfigurasi Tunjangan</h1>
          <p className="typography-muted mt-2">Kelola data tunjangan dan konfigurasi tunjangan</p>
        </div>
        <Button onClick={() => setAddModalOpen(true)} className="bg-slate-900 hover:bg-slate-800 text-white">
          <Plus className="mr-2 h-4 w-4" />
          Tambah Tunjangan
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="typography-h3">Daftar Tunjangan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between mb-4 gap-4">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari tunjangan..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              {selectedAllowances.length > 0 && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setBulkEditModalOpen(true)}
                    className="text-slate-700 border-slate-200 hover:bg-slate-50"
                  >
                    <Calculator className="mr-2 h-4 w-4" />
                    Edit ({selectedAllowances.length})
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setBulkDeleteModalOpen(true)}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    disabled={selectedAllowances.length === 0}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Hapus ({selectedAllowances.length})
                  </Button>
                </>
              )}
              <Button variant="outline" className="text-slate-700 border-slate-200 hover:bg-slate-50" size="sm" onClick={fetchAllowances}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Memuat data tunjangan...</span>
            </div>
          ) : (
            <div className="rounded-md border bg-background shadow-sm">
              <Table>
                <TableHeader className="bg-muted/50 border-b">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-12 px-4 py-3 font-semibold text-muted-foreground">
                      <Checkbox
                        checked={(() => {
                          const currentPageIds = paginatedAllowances.map(allowance => allowance.id);
                          const selectedInCurrentPage = currentPageIds.filter(id => selectedAllowances.includes(id));
                          
                          return selectedInCurrentPage.length === currentPageIds.length && currentPageIds.length > 0;
                        })()}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        aria-label="Select all allowances"
                      />
                    </TableHead>
                    <TableHead className="px-4 py-3 font-semibold text-muted-foreground">Nama</TableHead>
                    <TableHead className="px-4 py-3 font-semibold text-muted-foreground">Deskripsi</TableHead>
                    <TableHead className="px-4 py-3 font-semibold text-muted-foreground">Aturan Berlaku</TableHead>
                    <TableHead className="px-4 py-3 font-semibold text-muted-foreground">UMK</TableHead>
                    <TableHead className="px-4 py-3 font-semibold text-muted-foreground">Perusahaan</TableHead>
                    <TableHead className="px-4 py-3 font-semibold text-muted-foreground">Karyawan</TableHead>
                    <TableHead className="px-4 py-3 font-semibold text-muted-foreground text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedAllowances.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        {filteredAllowances.length === 0 && searchTerm ? 
                          "Tidak ada tunjangan yang sesuai dengan pencarian" : 
                          "Tidak ada data tunjangan"
                        }
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedAllowances.map((allowance) => (
                      <TableRow key={allowance.id} className="hover:bg-muted/50 transition-colors border-b last:border-b-0">
                        <TableCell className="px-4 py-4">
                          <Checkbox
                            checked={selectedAllowances.includes(allowance.id)}
                            onChange={(e) => handleSelectAllowance(allowance.id, e.target.checked)}
                            aria-label={`Select ${allowance.name}`}
                          />
                        </TableCell>
                        <TableCell className="px-4 py-4 font-medium">{allowance.name}</TableCell>
                        <TableCell className="px-4 py-4">
                          <div className="max-w-xs truncate">
                            {allowance.description || '-'}
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-4">
                          <div className="max-w-xs truncate">
                            {allowance.applicableRule}
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-4">
                          {formatCurrency(allowance.umkAmount)}
                        </TableCell>
                        <TableCell className="px-4 py-4">
                          <div className="text-sm">
                            <div>{allowance.companyPercentage || 0}%</div>
                            <div className="text-muted-foreground">
                              {formatCurrency(allowance.companyAmount)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-4">
                          <div className="text-sm">
                            <div>{allowance.employeePercentage || 0}%</div>
                            <div className="text-muted-foreground">
                              {formatCurrency(allowance.employeeAmount)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditAllowance(allowance)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => {
                                  setSelectedAllowance(allowance);
                                  setDeleteModalOpen(true);
                                }}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Hapus
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              
              {/* Pagination */}
              <DataTablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
                itemName="tunjangan"
                showRowsPerPage={true}
                showFirstLastButtons={true}
                showPageNumbers={true}
                className="border-t"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal tambah tunjangan */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Tambah Tunjangan Baru</DialogTitle>
            <DialogDescription>
              Tambahkan tunjangan baru ke dalam sistem.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAddAllowance)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Tunjangan</FormLabel>
                      <FormControl>
                        <Input placeholder="Masukkan nama tunjangan" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="umkAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jumlah UMK (Rp)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" placeholder="Masukkan jumlah UMK" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deskripsi (Opsional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Masukkan deskripsi tunjangan" 
                        className="resize-none" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="applicableRule"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Aturan Berlaku</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Masukkan aturan berlaku untuk tunjangan ini" 
                        className="resize-none" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="companyPercentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Persentase Perusahaan (%)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" max="100" step="0.01" placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="employeePercentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Persentase Karyawan (%)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" max="100" step="0.01" placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setAddModalOpen(false)}>
                  Batal
                </Button>
                <Button type="submit">Simpan</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Modal edit tunjangan */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Tunjangan</DialogTitle>
            <DialogDescription>
              Ubah informasi tunjangan yang sudah ada.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleUpdateAllowance)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Tunjangan</FormLabel>
                      <FormControl>
                        <Input placeholder="Masukkan nama tunjangan" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="umkAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jumlah UMK (Rp)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" placeholder="Masukkan jumlah UMK" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deskripsi (Opsional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Masukkan deskripsi tunjangan" 
                        className="resize-none" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="applicableRule"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Aturan Berlaku</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Masukkan aturan berlaku untuk tunjangan ini" 
                        className="resize-none" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="companyPercentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Persentase Perusahaan (%)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" max="100" step="0.01" placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="employeePercentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Persentase Karyawan (%)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" max="100" step="0.01" placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setEditModalOpen(false)}>
                  Batal
                </Button>
                <Button type="submit">Simpan Perubahan</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Modal konfirmasi hapus */}
      <AlertDialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Hapus Tunjangan</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus tunjangan &quot;{selectedAllowance?.name}&quot;? 
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAllowance} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal bulk edit */}
      <Dialog open={bulkEditModalOpen} onOpenChange={setBulkEditModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Massal - {selectedAllowances.length} Tunjangan</DialogTitle>
            <DialogDescription>
              Ubah nilai UMK dan persentase untuk beberapa tunjangan sekaligus. 
              Kosongkan field yang tidak ingin diubah.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...bulkEditForm}>
            <form onSubmit={bulkEditForm.handleSubmit(handleBulkEdit)} className="space-y-4">
              <FormField
                control={bulkEditForm.control}
                name="umkAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jumlah UMK (Rp)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0" 
                        placeholder="Kosongkan jika tidak ingin mengubah" 
                        {...field} 
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={bulkEditForm.control}
                  name="companyPercentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Persentase Perusahaan (%)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          max="100" 
                          step="0.01"
                          placeholder="0-100" 
                          {...field} 
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={bulkEditForm.control}
                  name="employeePercentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Persentase Karyawan (%)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          max="100" 
                          step="0.01"
                          placeholder="0-100" 
                          {...field} 
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
                <p className="font-medium mb-1">📊 Kalkulasi Otomatis:</p>
                <p>• Nominal perusahaan dan karyawan akan dihitung ulang berdasarkan UMK × persentase</p>
                <p>• Total persentase perusahaan + karyawan tidak boleh melebihi 100%</p>
              </div>
              
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setBulkEditModalOpen(false)} disabled={bulkEditLoading}>
                  Batal
                </Button>
                <Button type="submit" disabled={bulkEditLoading}>
                  {bulkEditLoading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Mengupdate...
                    </>
                  ) : (
                    <>
                      <Calculator className="mr-2 h-4 w-4" />
                      Update & Kalkulasi
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Modal bulk delete */}
      <AlertDialog open={bulkDeleteModalOpen} onOpenChange={setBulkDeleteModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Hapus Massal</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus {selectedAllowances.length} tunjangan yang dipilih? 
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleteLoading}>Batal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={bulkDeleteLoading}
            >
              {bulkDeleteLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Menghapus...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Hapus {selectedAllowances.length} Tunjangan
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
