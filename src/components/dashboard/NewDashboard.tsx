'use client'

import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Users, UserCheck, UserX, Clock, Activity, TrendingUp, AlertCircle } from 'lucide-react'
import { AttendanceCharts } from './AttendanceCharts'
import ActivityPanel from './ActivityPanel'
import { useDashboardData } from '@/hooks/useSWRHooks'
import { useSocket, useSocketEvent } from '@/hooks/useSocket'
import { useAuthActivityLogger } from '@/hooks/useAuthActivityLogger'
import { toast } from 'react-hot-toast'

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

interface DashboardStats {
  totalEmployees: number
  presentToday: number
  lateToday: number
  leaveToday: number
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



export default function NewDashboard() {
  const [selectedSubDept, setSelectedSubDept] = useState<string>('all')
  const [viewType, setViewType] = useState<'charts' | 'activity'>('charts')
  const [chartType, setChartType] = useState<'punctuality' | 'attendance'>('punctuality')
  const [days, setDays] = useState<string>('7')

  // Use SWR for data fetching with caching and revalidation
  const { data, error, isLoading, refresh, mutate } = useDashboardData(selectedSubDept, days)

  // Debug logging
  useEffect(() => {
    console.log('Dashboard data state:', { 
      hasData: !!data, 
      error, 
      isLoading,
      dataKeys: data ? Object.keys(data) : [],
      statsData: data?.stats,
      chartDataLength: data?.chartData?.punctualityTrend?.length || 0
    })
  }, [data, error, isLoading])

  // Socket.io for real-time updates
  const socket = useSocket()

  // Authentication activity logging
  const { logPageAccess } = useAuthActivityLogger()

  // Log dashboard access on component mount
  useEffect(() => {
    logPageAccess('Dashboard', {
      subDepartment: selectedSubDept,
      viewType,
      chartType,
      timeRange: days
    })
  }, [logPageAccess, selectedSubDept, viewType, chartType, days])

  // Real-time event handlers
  useSocketEvent('dashboard-update', useCallback((updateData: { type: string; data: ActivityItem }) => {
    console.log('Received dashboard update:', updateData)
    
    if (updateData.type === 'activity') {
      // Show toast notification for new activity
      toast.success(`${updateData.data.title}: ${updateData.data.user}`, {
        duration: 3000,
      })
    }
    
    // Trigger data refresh
    mutate()
  }, [mutate]))

  useSocketEvent('new-activity', useCallback((activityData: ActivityItem) => {
    console.log('Received new activity:', activityData)
    // Activity data will be included in dashboard refresh
    mutate()
  }, [mutate]))

  // Join socket rooms on mount
  useEffect(() => {
    if (socket) {
      socket.emit('join-dashboard')
      socket.emit('join-activities')
    }
  }, [socket])

  const chartData = chartType === 'punctuality' 
    ? data?.chartData?.punctualityTrend 
    : data?.chartData?.attendanceTrend

  // Get current stats based on filter
  const getCurrentStats = (): DashboardStats => {
    if (!data) {
      console.log('No data available for stats')
      return { totalEmployees: 0, presentToday: 0, lateToday: 0, leaveToday: 0 }
    }
    
    console.log('Using data for stats:', { 
      hasFilteredStats: !!data.filteredStats, 
      selectedSubDept,
      statsData: data.stats 
    })
    
    // If filtered by sub-department, use filtered stats
    if (selectedSubDept !== 'all' && data.filteredStats) {
      return data.filteredStats
    }
    
    // Otherwise use overall stats
    return data.stats || { totalEmployees: 0, presentToday: 0, lateToday: 0, leaveToday: 0 }
  }

  // Get total employees for ratio display (always show overall total)
  const getTotalEmployees = (): number => {
    if (!data?.stats) {
      console.log('No stats data available for total employees')
      return 0
    }
    return data.stats.totalEmployees || 0
  }

  if (isLoading) {
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
    console.error('Dashboard error:', error)
    return (
      <div className="flex flex-col items-center justify-center h-[400px] text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Error Loading Dashboard</h3>
          <p className="text-muted-foreground mb-4 max-w-md">
            {error.includes('Unauthorized') ? 
              'Session expired. Please login again.' : 
              `Failed to load dashboard data: ${error}`
            }
          </p>
          <div className="flex gap-2">
            <Button onClick={refresh} size="sm">
              Coba Lagi
            </Button>
            <Button 
              onClick={() => {
                console.log('Refreshing with force reload...')
                window.location.reload()
              }} 
              variant="outline" 
              size="sm"
            >
              Reload Halaman
            </Button>
            {error.includes('Unauthorized') && (
              <Button 
                onClick={() => {
                  window.location.href = '/login'
                }} 
                variant="destructive" 
                size="sm"
              >
                Login Ulang
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    console.log('No data received from API - likely authentication or server issue')
    return (
      <div className="flex flex-col items-center justify-center h-[400px] text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No Data Available</h3>
          <p className="text-muted-foreground mb-4">
            Data dashboard tidak tersedia. Ini mungkin karena:<br/>
            • Session expired atau authentication gagal<br/>
            • Server sedang bermasalah<br/>
            • Database belum memiliki data
          </p>
          <div className="flex gap-2">
            <Button onClick={refresh} size="sm">
              Refresh Data
            </Button>
            <Button 
              onClick={() => window.location.href = '/login'} 
              variant="outline" 
              size="sm"
            >
              Login Ulang
            </Button>
          </div>
        </div>
      </div>
    )
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
                {data?.subDepartments?.map((subDept: SubDepartment) => (
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
            <ActivityPanel />
          )}
        </div>
      </div>
    </div>
  )
}