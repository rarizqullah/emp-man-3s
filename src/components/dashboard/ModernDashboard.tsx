'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts'
import { Users, UserCheck, UserX, Clock, Activity, TrendingUp, Calendar } from 'lucide-react'

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

// Stats Card Component
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
  icon: React.ComponentType<any>
  variant?: 'default' | 'success' | 'warning' | 'destructive'
}) => {
  const ratio = `${value}/${totalValue}`
  
  const variantStyles = {
    default: 'bg-blue-50 text-blue-600',
    success: 'bg-green-50 text-green-600', 
    warning: 'bg-orange-50 text-orange-600',
    destructive: 'bg-red-50 text-red-600'
  }

  return (
    <Card className="border border-border/50 shadow-sm hover:shadow-md transition-all duration-200">
      <CardContent className="p-6">
        {/* Header with icon and ratio */}
        <div className="flex items-center justify-between mb-4">
          <div className={`p-2 rounded-lg ${variantStyles[variant]}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="text-right">
            <span className="text-xs font-medium text-muted-foreground">{ratio}</span>
          </div>
        </div>
        
        {/* Main value */}
        <div className="mb-2">
          <span className="text-3xl font-bold tracking-tight text-foreground">{value}</span>
        </div>
        
        {/* Title and subtitle */}
        <div>
          <h3 className="text-sm font-medium text-foreground mb-1">{title}</h3>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </CardContent>
    </Card>
  )
}

// Chart Component
const ChartComponent = ({ data, type }: { data: ChartDataPoint[], type: 'punctuality' | 'attendance' }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
        <TrendingUp className="h-16 w-16 text-muted-foreground/30 mb-4" />
        <h3 className="font-medium text-muted-foreground mb-2">
          {type === 'punctuality' ? 'Tingkat Ketepatan Waktu Harian' : 'Tren Tingkat Kehadiran Harian'}
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Data akan ditampilkan ketika tersedia
        </p>
      </div>
    )
  }

  if (type === 'punctuality') {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis 
            dataKey="day" 
            className="text-xs fill-muted-foreground"
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            className="text-xs fill-muted-foreground"
            tick={{ fontSize: 12 }}
            domain={[0, 100]}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '6px'
            }}
            formatter={(value) => [`${value}%`, 'Tingkat Ketepatan']}
          />
          <Line 
            type="monotone" 
            dataKey="punctualityRate" 
            stroke="hsl(var(--primary))" 
            strokeWidth={3}
            dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis 
          dataKey="day" 
          className="text-xs fill-muted-foreground"
          tick={{ fontSize: 12 }}
        />
        <YAxis 
          className="text-xs fill-muted-foreground"
          tick={{ fontSize: 12 }}
        />
        <Tooltip 
          contentStyle={{
            backgroundColor: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '6px'
          }}
        />
        <Legend />
        <Bar 
          dataKey="present" 
          fill="hsl(var(--primary))" 
          name="Hadir"
          radius={[2, 2, 0, 0]}
        />
        <Bar 
          dataKey="late" 
          fill="hsl(var(--destructive))" 
          name="Terlambat"
          radius={[2, 2, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}

// Recent Activity Component
const RecentActivityComponent = ({ activities }: { activities: ActivityItem[] }) => {
  if (!activities || activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
        <Activity className="h-16 w-16 text-muted-foreground/30 mb-4" />
        <h3 className="font-medium text-muted-foreground mb-2">Aktivitas Terbaru</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Aktivitas operasional sistem terbaru
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
        return <Activity className="h-4 w-4 text-gray-600" />
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return format(date, 'HH:mm', { locale: id })
  }

  return (
    <div className="space-y-3 max-h-[300px] overflow-y-auto">
      {activities.map((activity) => (
        <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors">
          <div className="mt-0.5">
            {getActivityIcon(activity.type)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-sm font-medium text-foreground truncate">
                {activity.title}
              </h4>
              <span className="text-xs text-muted-foreground ml-2">
                {formatTimestamp(activity.timestamp)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-1 line-clamp-2">
              {activity.description}
            </p>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {activity.department}
              </Badge>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// Main Dashboard Component
export default function ModernDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSubDept, setSelectedSubDept] = useState<string>('all')
  const [viewType, setViewType] = useState<'charts' | 'activity'>('charts')
  const [chartType, setChartType] = useState<'punctuality' | 'attendance'>('punctuality')

  // Fetch dashboard data
  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const url = new URL('/api/analytics/dashboard-v2', window.location.origin)
      if (selectedSubDept !== 'all') {
        url.searchParams.set('subDepartmentId', selectedSubDept)
      }
      url.searchParams.set('days', '7')

      const response = await fetch(url.toString())
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.success) {
        setData(result.data)
      } else {
        throw new Error(result.error || 'Failed to fetch data')
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Initial data load
  useEffect(() => {
    fetchData()
  }, [])

  // Refetch when sub-department filter changes
  useEffect(() => {
    fetchData()
  }, [selectedSubDept])

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

  // Get total employees for ratio display
  const getTotalEmployees = (): number => {
    return data?.stats.totalEmployees || 0
  }

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-48 mb-2"></div>
          <div className="h-4 bg-muted rounded w-64"></div>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <Card>
                <CardContent className="p-6">
                  <div className="h-24 bg-muted rounded"></div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="text-destructive mb-2">⚠️ Error</div>
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={fetchData} className="mt-4">Coba Lagi</Button>
      </div>
    )
  }

  if (!data) {
    return null
  }

  const currentStats = getCurrentStats()
  const totalEmployees = getTotalEmployees()

  return (
    <div className="space-y-6 p-6 max-h-screen overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Dashboard Overview · {format(new Date(), 'EEEE, dd MMMM yyyy', { locale: id })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedSubDept} onValueChange={setSelectedSubDept}>
            <SelectTrigger className="w-48">
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

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Employees"
          value={currentStats.totalEmployees}
          totalValue={totalEmployees}
          subtitle="Shift saat ini"
          icon={Users}
          variant="default"
        />
        
        <StatsCard
          title="Present Today"
          value={currentStats.presentToday}
          totalValue={totalEmployees}
          subtitle="Sudah check-in hari ini"
          icon={UserCheck}
          variant="success"
        />
        
        <StatsCard
          title="Leave Today"
          value={currentStats.leaveToday}
          totalValue={totalEmployees}
          subtitle="Belum melakukan presensi"
          icon={UserX}
          variant="warning"
        />
        
        <StatsCard
          title="Late Today"
          value={currentStats.lateToday}
          totalValue={totalEmployees}
          subtitle="Terlambat hari ini"
          icon={Clock}
          variant="destructive"
        />
      </div>

      {/* Segmented Control and Content */}
      <div className="space-y-6">
        {/* Segmented Control */}
        <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
          <Button
            variant={viewType === 'charts' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewType('charts')}
            className="rounded-md"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Chart
          </Button>
          <Button
            variant={viewType === 'activity' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewType('activity')}
            className="rounded-md"
          >
            <Activity className="h-4 w-4 mr-2" />
            Recent Activity
          </Button>
        </div>

        {/* Content Area */}
        <div className="grid gap-6 lg:grid-cols-1">
          {viewType === 'charts' ? (
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold">
                    {chartType === 'punctuality' ? 'Tingkat Ketepatan Waktu Harian' : 'Tren Tingkat Kehadiran Harian'}
                  </CardTitle>
                  <Select value={chartType} onValueChange={(value: 'punctuality' | 'attendance') => setChartType(value)}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="punctuality">Punctuality Rate per Day</SelectItem>
                      <SelectItem value="attendance">Tren Tingkat Kehadiran Harian</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-sm text-muted-foreground">
                  Tingkat ketepatan waktu harian dalam 7 hari terakhir
                </p>
              </CardHeader>
              <CardContent>
                <ChartComponent 
                  data={chartType === 'punctuality' ? data.chartData.punctualityTrend : data.chartData.attendanceTrend}
                  type={chartType}
                />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Aktivitas operasional sistem terbaru
                </p>
              </CardHeader>
              <CardContent>
                <RecentActivityComponent activities={data.recentActivity} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
} 