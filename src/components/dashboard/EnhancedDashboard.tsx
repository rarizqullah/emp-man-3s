'use client'

import React, { useState } from 'react'
import { 
  Wifi, 
  WifiOff, 
  Users, 
  Clock, 
  TrendingUp, 
  AlertTriangle,
  Activity,
  RefreshCw,
  Bell
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// Simple connection status component
const ConnectionStatus = () => {
  const [isConnected] = useState(true) // Simplified for now

  return (
    <Card className="mb-6">
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 ${isConnected ? 'text-green-500' : 'text-red-500'}`}>
              {isConnected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
              <span className="font-medium text-sm">{isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Last update: {new Date().toLocaleTimeString()}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge 
              variant={isConnected ? 'default' : 'destructive'}
              className="text-xs"
            >
              Real-time {isConnected ? 'ON' : 'OFF'}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Stats card component
const StatsCard = ({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  trend = 'neutral',
  description 
}: {
  title: string
  value: string | number
  change?: string
  icon: React.ComponentType<{ className?: string }>
  trend?: 'up' | 'down' | 'neutral'
  description?: string
}) => {
  const trendColors = {
    up: 'text-green-500',
    down: 'text-red-500',
    neutral: 'text-muted-foreground'
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        
        <div className="space-y-2">
          <div className="text-2xl font-bold">{value}</div>
          {change && (
            <div className={`flex items-center gap-1 text-xs ${trendColors[trend]}`}>
              {trend === 'up' && <TrendingUp className="h-3 w-3" />}
              {trend === 'down' && <AlertTriangle className="h-3 w-3" />}
              <span>{change}</span>
            </div>
          )}
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Progress card component
const ProgressCard = ({ 
  title, 
  description, 
  current, 
  target, 
  percentage 
}: {
  title: string
  description: string
  current: number
  target: number
  percentage: number
}) => {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{title}</h3>
            <Badge variant="outline">{percentage}%</Badge>
          </div>
          
          <p className="text-sm text-muted-foreground">{description}</p>
          
          <div className="flex justify-between text-sm">
            <span>{current}</span>
            <span className="text-muted-foreground">of {target}</span>
          </div>
          
          <Progress value={percentage} className="h-2" />
          
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Current</span>
            <span>Target</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Simple chart placeholder
const ChartPlaceholder = ({ title }: { title: string }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Chart will be loaded here</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80 flex items-center justify-center bg-muted rounded-lg">
          <div className="text-center">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Chart placeholder</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Main dashboard component
const EnhancedDashboard = () => {
  const [selectedTab, setSelectedTab] = useState('overview')

  // Mock data for stats
  const mockStats = {
    totalEmployees: 90,
    presentToday: 78,
    lateToday: 7,
    onLeave: 5,
    attendanceRate: 87,
    punctualityRate: 92
  }

  return (
    <div className="space-y-6 p-6">
      {/* Connection Status */}
      <ConnectionStatus />
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time attendance monitoring and analytics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Employees"
          value={mockStats.totalEmployees}
          icon={Users}
          description="Active employees"
        />
        <StatsCard
          title="Present Today"
          value={mockStats.presentToday}
          change="+5 from yesterday"
          trend="up"
          icon={Activity}
          description="Checked in employees"
        />
        <StatsCard
          title="Late Today"
          value={mockStats.lateToday}
          change="-2 from yesterday"
          trend="down"
          icon={Clock}
          description="Late arrivals"
        />
        <StatsCard
          title="On Leave"
          value={mockStats.onLeave}
          icon={AlertTriangle}
          description="Approved leaves"
        />
      </div>

      {/* Progress Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        <ProgressCard
          title="Attendance Rate"
          description="Overall attendance performance today"
          current={mockStats.presentToday + mockStats.lateToday}
          target={mockStats.totalEmployees}
          percentage={mockStats.attendanceRate}
        />
        <ProgressCard
          title="Punctuality Rate"
          description="On-time arrival rate today"
          current={mockStats.presentToday}
          target={mockStats.presentToday + mockStats.lateToday}
          percentage={mockStats.punctualityRate}
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="activities">Activities</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <ChartPlaceholder title="Attendance Overview" />
            </div>
            
            <div className="space-y-6">
              <ChartPlaceholder title="Distribution Chart" />
            </div>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <ChartPlaceholder title="Department Comparison" />
            <ChartPlaceholder title="Punctuality Trends" />
          </div>
          
          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Insights</CardTitle>
                <CardDescription>AI-powered attendance insights and recommendations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 dark:bg-blue-950">
                    <div className="h-2 w-2 rounded-full bg-blue-500 mt-2" />
                    <div>
                      <p className="font-medium text-sm">Attendance Trend</p>
                      <p className="text-sm text-muted-foreground">
                        Overall attendance has improved by 3% this week compared to last week.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-950">
                    <div className="h-2 w-2 rounded-full bg-green-500 mt-2" />
                    <div>
                      <p className="font-medium text-sm">Best Performing Department</p>
                      <p className="text-sm text-muted-foreground">
                        IT Department maintains the highest attendance rate at 94%.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-orange-50 dark:bg-orange-950">
                    <div className="h-2 w-2 rounded-full bg-orange-500 mt-2" />
                    <div>
                      <p className="font-medium text-sm">Lateness Pattern</p>
                      <p className="text-sm text-muted-foreground">
                        Monday morning shows higher lateness rates. Consider flexible start times.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Activities Tab */}
        <TabsContent value="activities" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activities</CardTitle>
              <CardDescription>Live attendance activities and system events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Sample activities */}
                {[
                  { type: 'check-in', name: 'John Doe', time: '08:15 AM', status: 'on-time' },
                  { type: 'check-in', name: 'Jane Smith', time: '08:45 AM', status: 'late' },
                  { type: 'leave', name: 'Mike Johnson', time: '08:30 AM', status: 'approved' },
                  { type: 'check-out', name: 'Sarah Wilson', time: '17:00 PM', status: 'on-time' },
                  { type: 'check-in', name: 'David Brown', time: '09:10 AM', status: 'late' }
                ].map((activity, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 rounded-lg border">
                    <div className={`h-3 w-3 rounded-full ${
                      activity.status === 'on-time' ? 'bg-green-500' :
                      activity.status === 'late' ? 'bg-red-500' :
                      activity.status === 'approved' ? 'bg-blue-500' : 'bg-gray-500'
                    }`} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">{activity.name}</p>
                        <span className="text-xs text-muted-foreground">{activity.time}</span>
                      </div>
                      <p className="text-sm text-muted-foreground capitalize">
                        {activity.type.replace('-', ' ')} - {activity.status.replace('-', ' ')}
                      </p>
                    </div>
                    <Badge 
                      variant={activity.status === 'on-time' ? 'default' : 
                              activity.status === 'late' ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {activity.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default EnhancedDashboard 