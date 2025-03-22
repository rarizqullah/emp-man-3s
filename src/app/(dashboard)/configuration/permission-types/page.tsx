"use client"

import { useState, useEffect } from "react"
import { 
  RefreshCw, 
  Info,
  Pencil,
  Search,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PermissionType } from "@prisma/client"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"

// Interface untuk detail jenis izin
interface PermissionTypeWithDetails {
  type: PermissionType
  name: string
  description: string
  maxDays?: number
  usageCount?: number
}

export default function PermissionTypesPage() {
  const [permissionTypes, setPermissionTypes] = useState<PermissionTypeWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredTypes, setFilteredTypes] = useState<PermissionTypeWithDetails[]>([])

  // State untuk dialog
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<PermissionTypeWithDetails | null>(null)

  // State untuk form
  const [formData, setFormData] = useState({
    selectedType: "",
    name: "",
    description: "",
    maxDays: ""
  })

  // Mengambil data jenis izin
  const fetchPermissionTypes = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/permission-types")
      
      if (!response.ok) {
        throw new Error("Gagal mengambil data jenis izin")
      }
      
      const data: PermissionTypeWithDetails[] = await response.json()
      setPermissionTypes(data)
      setFilteredTypes(data)
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: "Error",
        description: "Gagal mengambil data jenis izin",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Filter jenis izin berdasarkan kata kunci pencarian
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredTypes(permissionTypes)
    } else {
      const filtered = permissionTypes.filter(
        (type) =>
          type.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          type.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredTypes(filtered)
    }
  }, [searchTerm, permissionTypes])

  // Inisialisasi data
  useEffect(() => {
    fetchPermissionTypes()
  }, [])

  // Membuka dialog edit jenis izin
  const handleOpenEditDialog = (type: PermissionTypeWithDetails) => {
    setSelectedType(type)
    setFormData({
      selectedType: type.type,
      name: type.name,
      description: type.description,
      maxDays: type.maxDays ? String(type.maxDays) : ""
    })
    setIsEditDialogOpen(true)
  }

  // Handler perubahan input form
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  // Mengupdate jenis izin
  const handleUpdatePermissionType = async () => {
    if (!selectedType) return
    
    try {
      setIsLoading(true)
      
      // Validasi form
      if (!formData.name.trim() || !formData.description.trim()) {
        toast({
          title: "Error",
          description: "Nama dan deskripsi harus diisi",
          variant: "destructive",
        })
        return
      }

      const response = await fetch(`/api/permission-types/${selectedType.type}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          maxDays: formData.maxDays ? parseInt(formData.maxDays) : undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Gagal memperbarui jenis izin')
      }

      await fetchPermissionTypes()
      setIsEditDialogOpen(false)
      toast({
        title: "Berhasil",
        description: "Jenis izin berhasil diperbarui",
      })
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Gagal memperbarui jenis izin',
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Render loading
  if (isLoading && permissionTypes.length === 0) {
    return (
      <div className="p-6 flex justify-center">
        <div className="flex items-center space-x-2">
          <RefreshCw className="animate-spin h-5 w-5" />
          <span>Memuat data jenis izin...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Jenis Izin</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Daftar Jenis Izin</CardTitle>
          <CardDescription>
            Kelola jenis-jenis izin yang tersedia dalam sistem
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari jenis izin..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredTypes.map((permissionType) => (
              <Card key={permissionType.type}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{permissionType.name}</CardTitle>
                    {permissionType.maxDays && (
                      <Badge variant="secondary">
                        Maks. {permissionType.maxDays} hari
                      </Badge>
                    )}
                  </div>
                  <CardDescription>
                    {permissionType.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-sm space-x-1 mb-4">
                    <Info className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {permissionType.usageCount === undefined ? (
                        "Mengambil data penggunaan..."
                      ) : permissionType.usageCount === 0 ? (
                        "Belum digunakan"
                      ) : (
                        `Digunakan dalam ${permissionType.usageCount} izin`
                      )}
                    </span>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEditDialog(permissionType)}
                      className="flex items-center justify-center"
                      title="Edit data jenis izin"
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Dialog Edit Jenis Izin */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Jenis Izin</DialogTitle>
            <DialogDescription>
              Perbarui informasi jenis izin yang ada
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nama Jenis Izin</Label>
              <Input
                id="edit-name"
                name="name"
                placeholder="Nama jenis izin"
                value={formData.name}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Deskripsi</Label>
              <Textarea
                id="edit-description"
                name="description"
                placeholder="Deskripsi jenis izin"
                rows={3}
                value={formData.description}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-maxDays">Batas Hari Maksimal (Opsional)</Label>
              <Input
                id="edit-maxDays"
                name="maxDays"
                type="number"
                placeholder="Batas hari"
                value={formData.maxDays}
                onChange={handleInputChange}
              />
              <p className="text-sm text-muted-foreground">
                Biarkan kosong jika tidak ada batas
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleUpdatePermissionType} disabled={isLoading}>
              {isLoading ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 