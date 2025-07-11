"use client"

import React, { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Upload,
  Search,
  AlertTriangle,
  RotateCcw,
  CheckSquare,
  Users,
  Calendar,
  Clock,
  FileText,
  Download,
  Plus,
  Bell,
  UserPlus,
  Settings,
  BarChart3,
  Filter,
  RefreshCw
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'

// Quick Action Item Interface
interface QuickAction {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  bgColor: string
  action: () => void
  badge?: number
  disabled?: boolean
  category: 'attendance' | 'employee' | 'system' | 'reports'
}

// Bulk Attendance Upload Component
const BulkAttendanceUpload: React.FC<{ onUpload: (file: File) => void }> = ({ onUpload }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleUpload = () => {
    if (selectedFile) {
      onUpload(selectedFile)
      toast({
        title: "Upload Berhasil",
        description: `File ${selectedFile.name} berhasil diupload`,
      })
      setIsOpen(false)
      setSelectedFile(null)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start gap-2">
          <Upload className="h-4 w-4" />
          Bulk Upload Absensi
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Data Absensi</DialogTitle>
          <DialogDescription>
            Upload file Excel atau CSV untuk menambah data absensi secara massal
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="w-full"
            >
              <Upload className="mr-2 h-4 w-4" />
              Pilih File
            </Button>
            {selectedFile && (
              <p className="text-sm text-muted-foreground mt-2">
                File dipilih: {selectedFile.name}
              </p>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            Format yang didukung: .xlsx, .xls, .csv
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Batal
          </Button>
          <Button onClick={handleUpload} disabled={!selectedFile}>
            Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Quick Employee Search Component
const QuickEmployeeSearch: React.FC<{ onSearch: (query: string) => void }> = ({ onSearch }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setLoading(true)
    try {
      // Simulate API call
      setTimeout(() => {
        setSearchResults([
          { id: 1, name: 'John Doe', position: 'Developer', department: 'IT' },
          { id: 2, name: 'Jane Smith', position: 'Manager', department: 'HR' },
        ])
        setLoading(false)
      }, 1000)
    } catch (error) {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start gap-2">
          <Search className="h-4 w-4" />
          Cari Karyawan
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pencarian Karyawan</DialogTitle>
          <DialogDescription>
            Cari karyawan berdasarkan nama, ID, atau departemen
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Masukkan nama, ID, atau departemen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
          
          {searchResults.length > 0 && (
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {searchResults.map((employee) => (
                  <div key={employee.id} className="p-3 border rounded-lg hover:bg-gray-50">
                    <div className="font-medium">{employee.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {employee.position} - {employee.department}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Emergency Alert Component
const EmergencyAlert: React.FC<{ onSendAlert: (message: string, type: string) => void }> = ({ onSendAlert }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState('general')
  const { toast } = useToast()

  const handleSendAlert = () => {
    if (!alertMessage.trim()) return

    onSendAlert(alertMessage, alertType)
    toast({
      title: "Alert Terkirim",
      description: "Peringatan darurat telah dikirim ke semua karyawan",
      variant: "destructive",
    })
    setIsOpen(false)
    setAlertMessage('')
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start gap-2 text-red-600 border-red-200 hover:bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          Emergency Alert
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-red-600">Kirim Peringatan Darurat</DialogTitle>
          <DialogDescription>
            Kirim peringatan penting ke semua karyawan yang sedang aktif
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Select value={alertType} onValueChange={setAlertType}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih jenis alert" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="general">Umum</SelectItem>
              <SelectItem value="evacuation">Evakuasi</SelectItem>
              <SelectItem value="security">Keamanan</SelectItem>
              <SelectItem value="weather">Cuaca</SelectItem>
            </SelectContent>
          </Select>
          
          <Textarea
            placeholder="Tulis pesan peringatan..."
            value={alertMessage}
            onChange={(e) => setAlertMessage(e.target.value)}
            rows={4}
          />
          
          <div className="text-xs text-muted-foreground">
            Peringatan akan dikirim via notifikasi in-app dan email (jika dikonfigurasi)
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Batal
          </Button>
          <Button 
            onClick={handleSendAlert} 
            disabled={!alertMessage.trim()}
            className="bg-red-600 hover:bg-red-700"
          >
            <Bell className="mr-2 h-4 w-4" />
            Kirim Alert
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Main Quick Actions Panel Component
export const QuickActionsPanel: React.FC<{
  pendingApprovals?: number
  onBulkUpload?: (file: File) => void
  onEmployeeSearch?: (query: string) => void
  onEmergencyAlert?: (message: string, type: string) => void
  onShiftChange?: () => void
}> = ({
  pendingApprovals = 0,
  onBulkUpload = () => {},
  onEmployeeSearch = () => {},
  onEmergencyAlert = () => {},
  onShiftChange = () => {},
}) => {
  const { toast } = useToast()

  const quickActions: QuickAction[] = [
    {
      id: 'bulk-upload',
      title: 'Bulk Upload',
      description: 'Upload data absensi massal',
      icon: Upload,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      action: () => {},
      category: 'attendance'
    },
    {
      id: 'employee-search',
      title: 'Cari Karyawan',
      description: 'Pencarian cepat karyawan',
      icon: Search,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      action: () => {},
      category: 'employee'
    },
    {
      id: 'emergency-alert',
      title: 'Emergency Alert',
      description: 'Kirim peringatan darurat',
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      action: () => {},
      category: 'system'
    },
    {
      id: 'shift-change',
      title: 'Perubahan Shift',
      description: 'Kelola permintaan shift',
      icon: RotateCcw,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      action: onShiftChange,
      category: 'attendance'
    },
    {
      id: 'approval-queue',
      title: 'Antrian Persetujuan',
      description: 'Review pending approvals',
      icon: CheckSquare,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      action: () => {
        toast({
          title: "Navigasi",
          description: "Mengarahkan ke halaman persetujuan...",
        })
      },
      badge: pendingApprovals,
      category: 'system'
    },
    {
      id: 'add-employee',
      title: 'Tambah Karyawan',
      description: 'Daftarkan karyawan baru',
      icon: UserPlus,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      action: () => {
        window.location.href = '/employee/add'
      },
      category: 'employee'
    },
    {
      id: 'generate-report',
      title: 'Generate Laporan',
      description: 'Buat laporan kehadiran',
      icon: BarChart3,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
      action: () => {
        toast({
          title: "Report Generator",
          description: "Mempersiapkan laporan...",
        })
      },
      category: 'reports'
    },
    {
      id: 'export-data',
      title: 'Export Data',
      description: 'Download data dalam Excel',
      icon: Download,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      action: () => {
        toast({
          title: "Export Data",
          description: "Mempersiapkan file export...",
        })
      },
      category: 'reports'
    }
  ]

  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const filteredActions = selectedCategory === 'all' 
    ? quickActions 
    : quickActions.filter(action => action.category === selectedCategory)

  const categories = [
    { value: 'all', label: 'Semua', count: quickActions.length },
    { value: 'attendance', label: 'Absensi', count: quickActions.filter(a => a.category === 'attendance').length },
    { value: 'employee', label: 'Karyawan', count: quickActions.filter(a => a.category === 'employee').length },
    { value: 'system', label: 'Sistem', count: quickActions.filter(a => a.category === 'system').length },
    { value: 'reports', label: 'Laporan', count: quickActions.filter(a => a.category === 'reports').length },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Quick Actions
        </CardTitle>
        <CardDescription>
          Akses cepat untuk operasi yang sering digunakan
        </CardDescription>
        
        {/* Category Filter */}
        <div className="flex gap-1 mt-4">
          {categories.map((category) => (
            <Button
              key={category.value}
              variant={selectedCategory === category.value ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category.value)}
              className="text-xs"
            >
              {category.label}
              <Badge variant="secondary" className="ml-1 text-xs">
                {category.count}
              </Badge>
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredActions.map((action) => (
            <motion.div
              key={action.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="relative"
            >
              <Button
                variant="outline"
                onClick={action.action}
                disabled={action.disabled}
                className={`w-full h-auto p-4 flex flex-col items-center gap-3 hover:${action.bgColor} border-gray-200 hover:border-current transition-all`}
              >
                <div className={`p-3 rounded-lg ${action.bgColor}`}>
                  <action.icon className={`h-6 w-6 ${action.color}`} />
                </div>
                <div className="text-center">
                  <div className="font-medium text-sm">{action.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {action.description}
                  </div>
                </div>
                {action.badge !== undefined && action.badge > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 h-6 w-6 p-0 flex items-center justify-center"
                  >
                    {action.badge > 99 ? '99+' : action.badge}
                  </Badge>
                )}
              </Button>
            </motion.div>
          ))}
        </div>

        {/* Special Action Components */}
        <div className="mt-6 space-y-2">
          <BulkAttendanceUpload onUpload={onBulkUpload} />
          <QuickEmployeeSearch onSearch={onEmployeeSearch} />
          <EmergencyAlert onSendAlert={onEmergencyAlert} />
        </div>
      </CardContent>
    </Card>
  )
}

export default QuickActionsPanel 