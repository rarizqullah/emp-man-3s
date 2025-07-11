"use client"

import React from 'react'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// Color palettes
const COLORS = {
  primary: ['#3b82f6', '#60a5fa', '#93c5fd', '#c3ddfd', '#dbeafe'],
  success: ['#10b981', '#34d399', '#6ee7b7', '#9deccc', '#c6f6d5'],
  warning: ['#f59e0b', '#fbbf24', '#fcd34d', '#fde68a', '#fef3c7'],
  danger: ['#ef4444', '#f87171', '#fca5a5', '#fecaca', '#fee2e2'],
  mixed: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'],
}

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border rounded-lg shadow-lg">
        <p className="font-medium">{`${label}`}</p>
        {payload.map((pld: any, index: number) => (
          <div key={index} className="flex items-center gap-2 mt-1">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: pld.color }}
            />
            <span className="text-sm">
              {`${pld.dataKey}: ${pld.value}`}
            </span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

// Attendance Status Pie Chart
interface AttendanceStatusData {
  name: string
  value: number
  color: string
  percentage: number
}

export const AttendanceStatusPieChart: React.FC<{
  data: AttendanceStatusData[]
  title?: string
  description?: string
}> = ({ data, title = "Status Kehadiran", description = "Distribusi status kehadiran hari ini" }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col lg:flex-row items-center gap-4">
          <div className="w-full lg:w-2/3">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ percentage }) => `${percentage.toFixed(1)}%`}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="w-full lg:w-1/3 space-y-2">
            {data.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm font-medium">{item.name}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold">{item.value}</div>
                  <div className="text-xs text-muted-foreground">
                    {((item.value / total) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Department Performance Bar Chart
interface DepartmentData {
  department: string
  present: number
  absent: number
  late: number
  total: number
  attendanceRate: number
}

export const DepartmentPerformanceChart: React.FC<{
  data: DepartmentData[]
  title?: string
  description?: string
}> = ({ data, title = "Performa Departemen", description = "Tingkat kehadiran per departemen" }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="department" 
              angle={-45}
              textAnchor="end"
              height={80}
              fontSize={12}
            />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="present" fill="#10b981" name="Hadir" />
            <Bar dataKey="late" fill="#f59e0b" name="Terlambat" />
            <Bar dataKey="absent" fill="#ef4444" name="Tidak Hadir" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// Attendance Trend Line Chart
interface TrendData {
  date: string
  present: number
  absent: number
  late: number
  total: number
  attendanceRate: number
}

export const AttendanceTrendChart: React.FC<{
  data: TrendData[]
  title?: string
  description?: string
  period?: 'weekly' | 'monthly' | 'yearly'
}> = ({ 
  data, 
  title = "Tren Kehadiran", 
  description = "Tren kehadiran dalam periode waktu",
  period = 'weekly'
}) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Badge variant="outline" className="capitalize">
          {period}
        </Badge>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" fontSize={12} />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="attendanceRate" 
              stroke="#3b82f6" 
              strokeWidth={3}
              name="Tingkat Kehadiran (%)"
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
            />
            <Line 
              type="monotone" 
              dataKey="present" 
              stroke="#10b981" 
              strokeWidth={2}
              name="Hadir"
              dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
            />
            <Line 
              type="monotone" 
              dataKey="late" 
              stroke="#f59e0b" 
              strokeWidth={2}
              name="Terlambat"
              dot={{ fill: '#f59e0b', strokeWidth: 2, r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// Check-in Time Heatmap (simplified with area chart)
interface CheckInTimeData {
  hour: string
  count: number
  peak: boolean
}

export const CheckInTimeChart: React.FC<{
  data: CheckInTimeData[]
  title?: string
  description?: string
}> = ({ data, title = "Pola Jam Check-in", description = "Distribusi waktu check-in karyawan" }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="hour" />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.6}
              name="Jumlah Check-in"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// Overtime vs Regular Hours Donut Chart
interface WorkHoursData {
  type: string
  hours: number
  color: string
}

export const WorkHoursDonutChart: React.FC<{
  data: WorkHoursData[]
  title?: string
  description?: string
  totalHours?: number
}> = ({ 
  data, 
  title = "Distribusi Jam Kerja", 
  description = "Perbandingan jam reguler vs overtime",
  totalHours
}) => {
  const total = totalHours || data.reduce((sum, item) => sum + item.hours, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col lg:flex-row items-center gap-4">
          <div className="w-full lg:w-2/3 relative">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="hours"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Text */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold">{total}</div>
                <div className="text-sm text-muted-foreground">Total Jam</div>
              </div>
            </div>
          </div>
          <div className="w-full lg:w-1/3 space-y-3">
            {data.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                  <div>
                    <div className="text-sm font-medium">{item.type}</div>
                    <div className="text-xs text-muted-foreground">
                      {((item.hours / total) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold">{item.hours}</div>
                  <div className="text-xs text-muted-foreground">jam</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Monthly Performance Overview
interface MonthlyData {
  month: string
  attendance: number
  productivity: number
  overtime: number
}

export const MonthlyPerformanceChart: React.FC<{
  data: MonthlyData[]
  title?: string
  description?: string
}> = ({ data, title = "Performa Bulanan", description = "Overview performa bulanan" }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="attendance" fill="#3b82f6" name="Kehadiran (%)" />
            <Bar dataKey="productivity" fill="#10b981" name="Produktivitas (%)" />
            <Bar dataKey="overtime" fill="#f59e0b" name="Overtime (jam)" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export {
  COLORS,
  CustomTooltip
} 