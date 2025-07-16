'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Activity, Clock, Users, FileText, DollarSign, Settings } from 'lucide-react'
import { useActivitiesData } from '@/hooks/useSWRHooks'
import { useSocketEvent } from '@/hooks/useSocket'
import { format } from 'date-fns'

interface ActivityItem {
  id: string
  type: string
  title: string
  description: string
  email?: string // Email user yang melakukan aktivitas
  user: string
  department: string
  timestamp: string
  icon: string
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'AUTH':
      return <Users className="h-4 w-4 text-blue-600" />
    case 'ATTENDANCE':
      return <Clock className="h-4 w-4 text-green-600" />
    case 'EMPLOYEE':
      return <Users className="h-4 w-4 text-purple-600" />
    case 'PERMISSION':
      return <FileText className="h-4 w-4 text-orange-600" />
    case 'SALARY':
      return <DollarSign className="h-4 w-4 text-emerald-600" />
    case 'SYSTEM':
      return <Settings className="h-4 w-4 text-gray-600" />
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

const getActivityTypeLabel = (type: string) => {
  switch (type) {
    case 'AUTH':
      return 'Autentikasi'
    case 'ATTENDANCE':
      return 'Presensi'
    case 'EMPLOYEE':
      return 'Karyawan'
    case 'PERMISSION':
      return 'Izin'
    case 'SALARY':
      return 'Gaji'
    case 'SYSTEM':
      return 'Sistem'
    default:
      return 'Aktivitas'
  }
}

export default function EnhancedActivityComponent() {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const { data, error, isLoading, mutate } = useActivitiesData(15)

  // Debug logging
  useEffect(() => {
    console.log('Activities data state:', { data, error, isLoading })
  }, [data, error, isLoading])

  // Update local state when SWR data changes
  useEffect(() => {
    if (data && Array.isArray(data)) {
      console.log('Setting activities data:', data.length, 'items')
      setActivities(data)
    } else if (data) {
      console.log('Invalid activities data format:', data)
      setActivities([])
    }
  }, [data])

  // Real-time activity updates with fallback
  useSocketEvent('new-activity', (newActivity: ActivityItem) => {
    console.log('Received new activity via socket:', newActivity)
    setActivities(prev => {
      // Add new activity to the beginning and limit to 15 items
      const updated = [newActivity, ...prev].slice(0, 15)
      return updated
    })
    // Also trigger SWR revalidation
    mutate()
  })

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">Aktivitas Terbaru</CardTitle>
          <p className="text-sm text-muted-foreground">
            Memuat aktivitas sistem...
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                <div className="w-4 h-4 bg-muted rounded-full flex-shrink-0 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                  <div className="h-3 bg-muted rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">Aktivitas Terbaru</CardTitle>
          <p className="text-sm text-destructive">
            Gagal memuat aktivitas: {error}
          </p>
        </CardHeader>
      </Card>
    )
  }

  if (!activities || activities.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">Aktivitas Terbaru</CardTitle>
          <p className="text-sm text-muted-foreground">
            Aktivitas operasional sistem terbaru
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col items-center justify-center h-[240px] text-center">
            <Activity className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <h3 className="font-medium text-muted-foreground mb-2">Tidak ada aktivitas terbaru</h3>
            <p className="text-sm text-muted-foreground">
              Aktivitas akan muncul di sini saat ada operasi sistem
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold">Aktivitas Terbaru</CardTitle>
        <p className="text-sm text-muted-foreground">
          Aktivitas operasional sistem terbaru - Real Time
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
          {activities.map((activity) => (
            <div 
              key={activity.id} 
              className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg border border-border/50 hover:bg-muted/50 transition-all duration-200 hover:shadow-sm"
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
                <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                  {activity.description}
                </p>
                <div className="flex items-center gap-2 text-xs">
                  {activity.email && (
                    <Badge variant="outline" className="text-xs px-2 py-0.5 font-mono">
                      {activity.email}
                    </Badge>
                  )}
                  <Badge variant="secondary" className="text-xs px-2 py-0.5">
                    {activity.department}
                  </Badge>
                  <Badge variant="outline" className="text-xs px-2 py-0.5">
                    {getActivityTypeLabel(activity.type)}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
