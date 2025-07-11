'use client'

import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, UserCheck, UserX, Clock, Activity, TrendingUp, AlertCircle } from 'lucide-react'
import { AttendanceCharts } from './AttendanceCharts'

// Types
interface SubDepartment {
  id: string
  name: string
  departmentName: string
  employeeCount: number
  presentCount: number
}

interface ActivityItem {
  id: string
  type: string
  title: string
  description: string
  user: string
  department: string
  timestamp: string
  icon: string
}

interface ChartDataPoint {
  date: string
  day: string
  present: number
  late: number
  punctual: number
  absent: number
  attendanceRate: number
  punctualityRate: number
}

interface DashboardStats {
  totalEmployees: number
  presentToday: number
  lateToday: number
  leaveToday: number
}

interface FilteredStats {
  totalEmployees: number
  presentToday: number
  lateToday: number
  leaveToday: number
}

interface DashboardData {
  activeShift: {
    id: string
    name: string
    shiftType: string
    mainWorkStart: string | null
    mainWorkEnd: string | null
  }
  stats: DashboardStats
  filteredStats: FilteredStats | null
  subDepartments: SubDepartment[]
  chartData: {
    punctualityTrend: ChartDataPoint[]
    attendanceTrend: ChartDataPoint[]
  }
  recentActivity: ActivityItem[]
  metadata: {
    timestamp: string
    subDepartmentFilter: string | null
    currentTime: string
    currentDay: string
  }
}

// Stats Card Component - Clean design with prominent ratio display
const StatsCard = ({ 
  title, 
  value, 
  totalValue,
  subtitle, 
  icon: Icon,
  variant = 'default'
}: {
  title: string
  value: number
  totalValue: number
  subtitle: string
  icon: React.ElementType
  variant?: 'default' | 'success' | 'warning' | 'destructive'
}) => {
  const ratio = `${value}/${totalValue}`
  
  const variantStyles = {
    default: 'bg-blue-50 text-blue-600 border-blue-200',
    success: 'bg-green-50 text-green-600 border-green-200', 
    warning: 'bg-orange-50 text-orange-600 border-orange-200',
    destructive: 'bg-red-50 text-red-600 border-red-200'
  }

  return (
    <Card className="h-full border border-border/50 shadow-sm hover:shadow-md transition-all duration-200">
    <CardContent className="p-6">
        {/* Header with icon and ratio */}
      <div className="flex items-center justify-between mb-4">
          <div className={`p-2.5 rounded-lg border ${variantStyles[variant]}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="text-right">
            <span className="text-sm font-medium text-muted-foreground">{ratio}</span>
        </div>
      </div>
      
        {/* Main value - larger and prominent */}
        <div className="mb-3">
        <span className="text-3xl font-bold tracking-tight text-foreground">{value}</span>
      </div>
      
        {/* Title and subtitle */}
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground leading-tight">{subtitle}</p>
        </div>
    </CardContent>
  </Card>
  )
}



// Recent Activity Component - Compact design
const RecentActivityComponent = ({ activities }: { activities: ActivityItem[] }) => {
  if (!activities || activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[240px] text-center">
        <Activity className="h-10 w-10 text-muted-foreground/30 mb-3" />
        <h3 className="font-medium text-muted-foreground mb-2">Tidak ada aktivitas terbaru</h3>
        <p className="text-sm text-muted-foreground">
          Aktivitas akan muncul di sini saat ada operasi sistem
        </p>
      </div>
    )
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'CHECK_IN':
        return <Clock className="h-4 w-4 text-green-600" />
      case 'CHECK_OUT':
        return <Clock className="h-4 w-4 text-blue-600" />
      default:
        return <Activity className="h-4 w-4 text-muted-foreground" />
    }
  }

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp)
      const now = new Date()
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
      
      if (diffInMinutes < 1) return 'Baru saja'
      if (diffInMinutes < 60) return `${diffInMinutes}m yang lalu`
      if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}j yang lalu`
      return format(date, 'dd/MM HH:mm')
    } catch {
      return 'Invalid date'
    }
  }

  return (
    <div className="space-y-3 max-h-[240px] overflow-y-auto pr-2">
      {activities.map((activity) => (
        <div 
          key={activity.id} 
          className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors"
        >
          <div className="flex-shrink-0 mt-0.5">
            {getActivityIcon(activity.type)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h4 className="text-sm font-medium text-foreground truncate">
                {activity.title}
              </h4>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {formatTimestamp(activity.timestamp)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-1 line-clamp-2">
              {activity.description}
            </p>
            <div className="flex items-center gap-2 text-xs">
              <Badge variant="secondary" className="text-xs px-2 py-0.5">
                {activity.department}
              </Badge>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function NewDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSubDept, setSelectedSubDept] = useState<string>('all')
  const [viewType, setViewType] = useState<'charts' | 'activity'>('charts')
  const [chartType, setChartType] = useState<'punctuality' | 'attendance'>('punctuality')
  const [days, setDays] = useState<string>('7')

  const chartData = chartType === 'punctuality' 
    ? data?.chartData?.punctualityTrend 
    : data?.chartData?.attendanceTrend

  // Fetch dashboard data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams()
      if (selectedSubDept !== 'all') {
        params.append('subDepartmentId', selectedSubDept)
      }
      params.append('days', days)
      
      const url = `/api/analytics/dashboard-v2?${params}`
      const response = await fetch(url)
        
        if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch dashboard data`)
        }
        
        const result = await response.json()
        
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch dashboard data')
      }
      
          setData(result.data)
    } catch (err) {
        console.error('Dashboard fetch error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      } finally {
        setLoading(false)
      }
    }, [days, selectedSubDept])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Get current stats based on filter
  const getCurrentStats = (): DashboardStats => {
    if (!data) return { totalEmployees: 0, presentToday: 0, lateToday: 0, leaveToday: 0 }
    
    // If filtered by sub-department, use filtered stats
    if (selectedSubDept !== 'all' && data.filteredStats) {
      return data.filteredStats
    }
    
    // Otherwise use overall stats
    return data.stats
  }

  // Get total employees for ratio display (always show overall total)
  const getTotalEmployees = (): number => {
    return data?.stats.totalEmployees || 0
  }

  if (loading) {
    return (
      <div className="space-y-6 h-screen max-h-screen overflow-hidden">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-48 mb-2"></div>
          <div className="h-4 bg-muted rounded w-64"></div>
        </div>
        <div className="grid gap-4 lg:grid-cols-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <Card className="h-[140px]">
                <CardContent className="p-6">
                  <div className="h-20 bg-muted rounded"></div>
                </CardContent>
              </Card>
          </div>
            ))}
          </div>
        <div className="animate-pulse">
          <Card className="h-[360px]">
            <CardContent className="p-6">
              <div className="h-full bg-muted rounded"></div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Error Loading Dashboard</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={fetchData} size="sm">
              Coba Lagi
            </Button>
        </div>
      </div>
    )
  }

  if (!data) {
    return null
  }

  const currentStats = getCurrentStats()
  const totalEmployees = getTotalEmployees()

  return (
    <div className="space-y-6 h-screen max-h-screen overflow-hidden p-6 transition-all duration-300 ease-in-out">
      {/* Header - consistent with other pages */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="typography-h1">Dashboard</h1>
          <p className="typography-muted mt-2">
            Dashboard Overview · {format(new Date(), 'EEEE, dd MMMM yyyy', { locale: id })}
          </p>
        </div>
        <div className="flex gap-3">
          <Select value={selectedSubDept} onValueChange={setSelectedSubDept}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Pilih Sub Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Sub Department</SelectItem>
                {data.subDepartments.map((subDept) => (
                  <SelectItem key={subDept.id} value={subDept.id}>
                    {subDept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
      </div>

      {/* Stats Cards Grid - optimized for single screen */}
      <div className="grid gap-4 lg:grid-cols-4 md:grid-cols-2">
        <StatsCard
          title="Total Karyawan"
          value={currentStats.totalEmployees}
          totalValue={totalEmployees}
          subtitle="Shift saat ini"
          icon={Users}
          variant="default"
        />
        
        <StatsCard
          title="Hari Ini Hadir"
          value={currentStats.presentToday}
          totalValue={totalEmployees}
          subtitle="Sudah check-in hari ini"
          icon={UserCheck}
          variant="success"
        />
        
        <StatsCard
          title="Hari Ini Pulang"
          value={currentStats.leaveToday}
          totalValue={totalEmployees}
          subtitle="Sudah check-out hari ini"
          icon={UserX}
          variant="warning"
        />
        
        <StatsCard
          title="Hari Ini Terlambat"
          value={currentStats.lateToday}
          totalValue={totalEmployees}
          subtitle="Terlambat hari ini"
          icon={Clock}
          variant="destructive"
        />
      </div>

              {/* Content Area - Segmented Control and Charts/Activity */}
        <div className="space-y-4 flex-1 min-h-0 transition-all duration-300 ease-in-out">
          {/* Segmented Control */}
        <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
          <Button
            variant={viewType === 'charts' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewType('charts')}
            className="rounded-md px-6 min-w-[120px] justify-center"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Grafik
          </Button>
          <Button
            variant={viewType === 'activity' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewType('activity')}
            className="rounded-md px-6 min-w-[120px] justify-center"
          >
            <Activity className="h-4 w-4 mr-2" />
            Aktivitas
          </Button>
        </div>

        {/* Content Card - Single container for compact display */}
        <div className="flex-1 min-h-0 [transform:translateZ(0)]">
          {viewType === 'charts' ? (
            <AttendanceCharts 
              data={chartData || []}
              type={chartType}
              onTypeChange={setChartType}
              days={days}
              onDaysChange={setDays}
            />
          ) : (
            <Card className="flex-1 min-h-0">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Aktivitas Terbaru</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Aktivitas operasional sistem terbaru
                </p>
              </CardHeader>
              <CardContent className="pt-0">
                <RecentActivityComponent activities={data.recentActivity} />
            </CardContent>
          </Card>
          )}
        </div>
      </div>
    </div>
  )
} 