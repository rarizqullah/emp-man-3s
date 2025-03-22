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
  Layers,
  UserRound
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

interface Department {
  id: string
  name: string
}

interface SubDepartment {
  id: string
  name: string
  departmentId: string
  department: Department
  _count: {
    employees: number
  }
  createdAt: string
  updatedAt: string
}

// Schema validasi untuk form sub-departemen
const subDepartmentFormSchema = z.object({
  name: z.string().min(1, { message: "Nama sub-departemen wajib diisi" }),
  departmentId: z.string().min(1, { message: "Departemen wajib dipilih" }),
})

type SubDepartmentFormValues = z.infer<typeof subDepartmentFormSchema>

export default function SubDepartmentsPage() {
  const [subDepartments, setSubDepartments] = useState<SubDepartment[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterDepartmentId, setFilterDepartmentId] = useState<string>("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [currentSubDepartment, setCurrentSubDepartment] = useState<SubDepartment | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  // Form untuk tambah/edit sub-departemen
  const form = useForm<SubDepartmentFormValues>({
    resolver: zodResolver(subDepartmentFormSchema),
    defaultValues: {
      name: "",
      departmentId: "",
    },
  })

  // Mengambil daftar departemen untuk dropdown
  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/departments')
      
      if (!response.ok) {
        throw new Error('Gagal mengambil data departemen')
      }
      
      const data: Department[] = await response.json()
      setDepartments(data)
    } catch (error) {
      console.error('Error:', error)
      toast.error('Gagal memuat data departemen')
    }
  }

  // Mengambil daftar sub-departemen
  const fetchSubDepartments = async () => {
    try {
      setIsLoading(true)
      
      // Buat URL dengan filter departemen jika ada
      let url = '/api/sub-departments'
      if (filterDepartmentId && filterDepartmentId !== 'ALL') {
        url += `?departmentId=${filterDepartmentId}`
      }
      
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error('Gagal mengambil data sub-departemen')
      }
      
      const data: SubDepartment[] = await response.json()
      setSubDepartments(data)
    } catch (error) {
      console.error('Error:', error)
      toast.error('Gagal memuat data sub-departemen')
    } finally {
      setIsLoading(false)
    }
  }

  // Inisialisasi data
  useEffect(() => {
    const init = async () => {
      await fetchDepartments()
      await fetchSubDepartments()
    }
    
    init()
  }, [])

  // Re-fetch saat filter departemen berubah
  useEffect(() => {
    fetchSubDepartments()
  }, [filterDepartmentId])

  // Filter sub-departemen berdasarkan pencarian
  const filteredSubDepartments = subDepartments.filter(subDept => 
    subDept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    subDept.department.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Menangani submit form tambah sub-departemen
  const handleAddSubDepartmentSubmit = async (data: SubDepartmentFormValues) => {
    try {
      const response = await fetch('/api/sub-departments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || errorData.error || 'Gagal menambahkan sub-departemen')
      }
      
      await fetchSubDepartments()
      setIsAddDialogOpen(false)
      form.reset()
      toast.success('Sub-departemen berhasil ditambahkan')
    } catch (error: unknown) {
      console.error('Error:', error)
      if (error instanceof Error) {
        toast.error(error.message || 'Gagal menambahkan sub-departemen')
      } else {
        toast.error('Gagal menambahkan sub-departemen')
      }
    }
  }

  // Mengisi form untuk edit sub-departemen
  const handleEditSubDepartment = (subDepartment: SubDepartment) => {
    setCurrentSubDepartment(subDepartment)
    form.setValue('name', subDepartment.name)
    form.setValue('departmentId', subDepartment.departmentId)
    setIsEditDialogOpen(true)
  }

  // Menangani submit form edit sub-departemen
  const handleEditSubDepartmentSubmit = async (data: SubDepartmentFormValues) => {
    if (!currentSubDepartment) return
    
    try {
      const response = await fetch(`/api/sub-departments/${currentSubDepartment.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || errorData.error || 'Gagal mengupdate sub-departemen')
      }
      
      await fetchSubDepartments()
      setIsEditDialogOpen(false)
      form.reset()
      toast.success('Sub-departemen berhasil diperbarui')
    } catch (error: unknown) {
      console.error('Error:', error)
      if (error instanceof Error) {
        toast.error(error.message || 'Gagal mengupdate sub-departemen')
      } else {
        toast.error('Gagal mengupdate sub-departemen')
      }
    }
  }

  // Membuka dialog konfirmasi hapus
  const openDeleteDialog = (subDepartment: SubDepartment) => {
    setCurrentSubDepartment(subDepartment)
    setIsDeleteDialogOpen(true)
  }

  // Menangani hapus sub-departemen
  const handleDeleteSubDepartment = async () => {
    if (!currentSubDepartment) return
    
    try {
      const response = await fetch(`/api/sub-departments/${currentSubDepartment.id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || errorData.error || 'Gagal menghapus sub-departemen')
      }
      
      await fetchSubDepartments()
      setIsDeleteDialogOpen(false)
      toast.success('Sub-departemen berhasil dihapus')
    } catch (error: unknown) {
      console.error('Error:', error)
      if (error instanceof Error) {
        toast.error(error.message || 'Gagal menghapus sub-departemen')
      } else {
        toast.error('Gagal menghapus sub-departemen')
      }
    }
  }

  // Render loading
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Memuat data sub-departemen...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Konfigurasi Sub-Departemen</h1>
          <p className="text-muted-foreground mt-1">
            Kelola daftar sub-departemen yang tersedia dalam sistem
          </p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Tambah Sub-Departemen
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tambah Sub-Departemen Baru</DialogTitle>
              <DialogDescription>
                Tambahkan sub-departemen baru ke dalam sistem.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleAddSubDepartmentSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="departmentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Departemen</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih departemen" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {departments.map((department) => (
                            <SelectItem key={department.id} value={department.id}>
                              {department.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Sub-Departemen</FormLabel>
                      <FormControl>
                        <Input placeholder="Masukkan nama sub-departemen" {...field} />
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
      
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 md:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Cari sub-departemen..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <Select
          value={filterDepartmentId}
          onValueChange={setFilterDepartmentId}
        >
          <SelectTrigger className="w-full sm:w-[240px]">
            <SelectValue placeholder="Filter departemen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua departemen</SelectItem>
            {departments.map((department) => (
              <SelectItem key={department.id} value={department.id}>
                {department.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Button variant="outline" size="icon" onClick={fetchSubDepartments}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
      
      {filteredSubDepartments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <Layers className="h-10 w-10 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Tidak ada sub-departemen</p>
            <p className="text-sm text-muted-foreground">
              {subDepartments.length > 0 
                ? 'Tidak ada sub-departemen yang sesuai dengan pencarian atau filter Anda' 
                : 'Belum ada sub-departemen yang ditambahkan. Klik "Tambah Sub-Departemen" untuk mulai.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredSubDepartments.map((subDept) => (
            <Card key={subDept.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <Badge className="w-fit mb-1" variant="outline">
                      {subDept.department.name}
                    </Badge>
                    <CardTitle>{subDept.name}</CardTitle>
                  </div>
                  <div className="flex gap-2">
                    <Button size="icon" variant="outline" onClick={() => handleEditSubDepartment(subDept)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="outline" 
                      className="text-destructive"
                      onClick={() => openDeleteDialog(subDept)}
                      disabled={subDept._count.employees > 0}
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
                      {subDept._count.employees} Karyawan
                    </span>
                  </div>
                  {subDept._count.employees > 0 && (
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
      
      {/* Dialog edit sub-departemen */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Sub-Departemen</DialogTitle>
            <DialogDescription>
              Ubah informasi sub-departemen yang sudah ada
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleEditSubDepartmentSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="departmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Departemen</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih departemen" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {departments.map((department) => (
                          <SelectItem key={department.id} value={department.id}>
                            {department.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Sub-Departemen</FormLabel>
                    <FormControl>
                      <Input placeholder="Masukkan nama sub-departemen" {...field} />
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
            <AlertDialogTitle>Konfirmasi Hapus Sub-Departemen</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus sub-departemen &quot;{currentSubDepartment?.name}&quot; dari departemen &quot;{currentSubDepartment?.department.name}&quot;? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSubDepartment} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 