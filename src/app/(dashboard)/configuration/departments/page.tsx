"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { toast } from "sonner"
import { 
  Pencil, 
  Trash2, 
  Plus, 
  Search, 
  RefreshCw,
  Building2,
  UserRound,
  Layers
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Badge } from "@/components/ui/badge"

interface Department {
  id: string
  name: string
  _count: {
    employees: number
    subDepartments: number
  }
  createdAt: string
  updatedAt: string
}

// Schema validasi untuk form departemen
const departmentFormSchema = z.object({
  name: z.string().min(1, { message: "Nama departemen wajib diisi" }),
})

type DepartmentFormValues = z.infer<typeof departmentFormSchema>

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [currentDepartment, setCurrentDepartment] = useState<Department | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  // Form untuk tambah/edit departemen
  const form = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentFormSchema),
    defaultValues: {
      name: "",
    },
  })

  // Mengambil daftar departemen
  const fetchDepartments = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/departments')
      
      if (!response.ok) {
        throw new Error('Gagal mengambil data departemen')
      }
      
      const data: Department[] = await response.json()
      setDepartments(data)
    } catch (error) {
      console.error('Error:', error)
      toast.error('Gagal memuat data departemen')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDepartments()
  }, [])

  // Filter departemen berdasarkan pencarian
  const filteredDepartments = departments.filter(department => 
    department.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Menangani submit form tambah departemen
  const handleAddDepartmentSubmit = async (data: DepartmentFormValues) => {
    try {
      const response = await fetch('/api/departments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Gagal menambahkan departemen')
      }
      
      await fetchDepartments()
      setIsAddDialogOpen(false)
      form.reset()
      toast.success('Departemen berhasil ditambahkan')
    } catch (error: any) {
      console.error('Error:', error)
      toast.error(error.message || 'Gagal menambahkan departemen')
    }
  }

  // Mengisi form untuk edit departemen
  const handleEditDepartment = (department: Department) => {
    setCurrentDepartment(department)
    form.setValue('name', department.name)
    setIsEditDialogOpen(true)
  }

  // Menangani submit form edit departemen
  const handleEditDepartmentSubmit = async (data: DepartmentFormValues) => {
    if (!currentDepartment) return
    
    try {
      const response = await fetch(`/api/departments/${currentDepartment.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Gagal mengupdate departemen')
      }
      
      await fetchDepartments()
      setIsEditDialogOpen(false)
      form.reset()
      toast.success('Departemen berhasil diperbarui')
    } catch (error: any) {
      console.error('Error:', error)
      toast.error(error.message || 'Gagal mengupdate departemen')
    }
  }

  // Membuka dialog konfirmasi hapus
  const openDeleteDialog = (department: Department) => {
    setCurrentDepartment(department)
    setIsDeleteDialogOpen(true)
  }

  // Menangani hapus departemen
  const handleDeleteDepartment = async () => {
    if (!currentDepartment) return
    
    try {
      const response = await fetch(`/api/departments/${currentDepartment.id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || errorData.error || 'Gagal menghapus departemen')
      }
      
      await fetchDepartments()
      setIsDeleteDialogOpen(false)
      toast.success('Departemen berhasil dihapus')
    } catch (error: any) {
      console.error('Error:', error)
      toast.error(error.message || 'Gagal menghapus departemen')
    }
  }

  // Render loading
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Memuat data departemen...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Konfigurasi Departemen</h1>
          <p className="text-muted-foreground mt-1">
            Kelola daftar departemen yang tersedia dalam sistem
          </p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Tambah Departemen
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tambah Departemen Baru</DialogTitle>
              <DialogDescription>
                Tambahkan departemen baru ke dalam sistem.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleAddDepartmentSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Departemen</FormLabel>
                      <FormControl>
                        <Input placeholder="Masukkan nama departemen" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button variant="outline" type="button" onClick={() => setIsAddDialogOpen(false)}>
                    Batal
                  </Button>
                  <Button type="submit">Simpan</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="relative flex-1 md:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Cari departemen..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button variant="outline" size="icon" onClick={fetchDepartments}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
      
      {filteredDepartments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <Building2 className="h-10 w-10 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Tidak ada departemen</p>
            <p className="text-sm text-muted-foreground">
              {departments.length > 0 
                ? 'Tidak ada departemen yang sesuai dengan pencarian Anda' 
                : 'Belum ada departemen yang ditambahkan. Klik "Tambah Departemen" untuk mulai.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredDepartments.map((department) => (
            <Card key={department.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle>{department.name}</CardTitle>
                  <div className="flex gap-2">
                    <Button size="icon" variant="outline" onClick={() => handleEditDepartment(department)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="outline" 
                      className="text-destructive"
                      onClick={() => openDeleteDialog(department)}
                      disabled={department._count.employees > 0 || department._count.subDepartments > 0}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <UserRound className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {department._count.employees} Karyawan
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {department._count.subDepartments} Sub-departemen
                    </span>
                  </div>
                  {(department._count.employees > 0 || department._count.subDepartments > 0) && (
                    <Badge variant="outline" className="w-fit mt-2 text-xs">
                      Tidak dapat dihapus
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Dialog edit departemen */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Departemen</DialogTitle>
            <DialogDescription>
              Ubah informasi departemen yang sudah ada
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleEditDepartmentSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Departemen</FormLabel>
                    <FormControl>
                      <Input placeholder="Masukkan nama departemen" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setIsEditDialogOpen(false)}>
                  Batal
                </Button>
                <Button type="submit">Simpan</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Dialog konfirmasi hapus */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Hapus Departemen</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus departemen "{currentDepartment?.name}"? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDepartment} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 