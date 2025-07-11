"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { format, parseISO } from "date-fns"
import { id } from "date-fns/locale"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Chart configuration
const chartConfig = {
  present: {
    label: "Hadir",
    color: "hsl(var(--chart-1))",
  },
  late: {
    label: "Terlambat", 
    color: "hsl(var(--chart-2))",
  },
  punctualityRate: {
    label: "Tingkat Ketepatan",
    color: "hsl(var(--chart-1))",
  },
  attendanceRate: {
    label: "Tingkat Kehadiran",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

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

interface AttendanceChartsProps {
  data: ChartDataPoint[]
  type: 'punctuality' | 'attendance'
  onTypeChange: (type: 'punctuality' | 'attendance') => void
  days: string
  onDaysChange: (days: string) => void
}

export function AttendanceCharts({ data, type, onTypeChange, days, onDaysChange }: AttendanceChartsProps) {
  // Convert days to timeRange format for display
  const timeRange = days === '7' ? '7d' : days === '30' ? '30d' : '90d'
  
  const setTimeRange = (range: string) => {
    const daysValue = range === '7d' ? '7' : range === '30d' ? '30' : '90'
    onDaysChange(daysValue)
  }

  // Use only real data from API
  const filteredData = data || []

  // Compute X-axis ticks based on selected time range
  const xAxisTicks = React.useMemo(() => {
    if (!filteredData.length) return []
    return filteredData
      .filter((_, index) => {
        if (days === '7') return true // show all days
        if (days === '30') return index % 2 === 0 // every 2 days
        if (days === '90') return index % 5 === 0 // every 5 days
        return true
      })
      .map((d) => d.date)
  }, [filteredData, days])


  const getChartTitle = () => {
    switch (type) {
      case 'punctuality':
        return 'Tingkat Ketepatan Waktu Harian'
      case 'attendance':
        return 'Tren Tingkat Kehadiran Harian'
      default:
        return 'Grafik'
    }
  }

  const getChartDescription = () => {
    switch (type) {
      case 'punctuality':
        return `Tingkat ketepatan waktu harian dalam ${timeRange === '7d' ? '7 hari' : timeRange === '30d' ? '30 hari' : '3 bulan'} terakhir`
      case 'attendance':
        return `Tren tingkat kehadiran dan keterlambatan dalam ${timeRange === '7d' ? '7 hari' : timeRange === '30d' ? '30 hari' : '3 bulan'} terakhir`
      default:
        return 'Data grafik kehadiran'
    }
  }

  if (!filteredData || filteredData.length === 0) {
  return (
    <Card>
        <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
          <div className="grid flex-1 gap-1">
            <CardTitle>{getChartTitle()}</CardTitle>
            <CardDescription>
              {getChartDescription()}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Select value={type} onValueChange={(value: 'punctuality' | 'attendance') => onTypeChange(value)}>
              <SelectTrigger className="w-[200px] rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="punctuality" className="rounded-lg">
                  Tingkat Ketepatan
                </SelectItem>
                <SelectItem value="attendance" className="rounded-lg">
                  Tren Kehadiran
                </SelectItem>
              </SelectContent>
            </Select>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[160px] rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="7d" className="rounded-lg">
                  7 Hari Terakhir
                </SelectItem>
                <SelectItem value="30d" className="rounded-lg">
                  30 Hari Terakhir
                </SelectItem>
                <SelectItem value="90d" className="rounded-lg">
                  3 Bulan Terakhir
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
      </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <div className="flex flex-col items-center justify-center h-[250px] text-center">
            <div className="text-muted-foreground">
              <svg
                className="h-12 w-12 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h3 className="font-medium mb-2">{getChartTitle()}</h3>
              <p className="text-sm max-w-sm">
                Data akan ditampilkan ketika tersedia
              </p>
            </div>
          </div>
      </CardContent>
    </Card>
  )
}

  return (
    <Card>
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle>{getChartTitle()}</CardTitle>
          <CardDescription>
            {getChartDescription()}
          </CardDescription>
        </div>
                  <div className="flex gap-2">
            <Select value={type} onValueChange={(value: 'punctuality' | 'attendance') => onTypeChange(value)}>
              <SelectTrigger className="w-[200px] rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="punctuality" className="rounded-lg">
                  Tingkat Ketepatan
                </SelectItem>
                <SelectItem value="attendance" className="rounded-lg">
                  Tren Kehadiran
                </SelectItem>
              </SelectContent>
            </Select>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[160px] rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="7d" className="rounded-lg">
                  7 Hari Terakhir
                </SelectItem>
                <SelectItem value="30d" className="rounded-lg">
                  30 Hari Terakhir
                </SelectItem>
                <SelectItem value="90d" className="rounded-lg">
                  3 Bulan Terakhir
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full overflow-hidden">
          <AreaChart data={filteredData}>
            <defs>
              {type === 'punctuality' ? (
                <linearGradient id="fillPunctuality" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-punctualityRate)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-punctualityRate)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
              ) : (
                <>
                  <linearGradient id="fillPresent" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="var(--color-present)"
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--color-present)"
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                  <linearGradient id="fillLate" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="var(--color-late)"
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--color-late)"
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                </>
              )}
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              ticks={xAxisTicks}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                try {
                  const date = parseISO(value as string)
                  return format(date, 'd MMM', { locale: id })
                } catch {
                  return value as string
                }
              }}
            />
            {/* Add YAxis for proper scaling */}
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              domain={type === 'punctuality' ? [0, 100] : [0, 'dataMax']}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value, payload) => {
                    if (payload && payload[0]?.payload?.date) {
                      try {
                        const date = parseISO(payload[0].payload.date)
                        return format(date, 'EEEE, dd MMMM yyyy', { locale: id })
                      } catch {
                        return value as string
                      }
                    }
                    return value as string
                  }}
                  indicator="dot"
                />
              }
            />
            {type === 'punctuality' ? (
              <Area
                dataKey="punctualityRate"
                type="monotone"
                fill="url(#fillPunctuality)"
                stroke="var(--color-punctualityRate)"
                strokeWidth={2}
                fillOpacity={0.6}
              />
            ) : (
              <>
                <Area
                  dataKey="late"
                  type="monotone"
                  fill="url(#fillLate)"
                  stroke="var(--color-late)"
                  strokeWidth={2}
                  fillOpacity={0.6}
                  stackId="1"
                />
                <Area
                  dataKey="present"
                  type="monotone"
                  fill="url(#fillPresent)"
                  stroke="var(--color-present)"
                  strokeWidth={2}
                  fillOpacity={0.6}
                  stackId="1"
                />
              </>
            )}
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
} 