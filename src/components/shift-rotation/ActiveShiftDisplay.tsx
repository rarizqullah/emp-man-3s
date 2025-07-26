"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock, RotateCcw, Users } from "lucide-react"
import { format } from "date-fns"
import { id } from "date-fns/locale"

interface ActiveShiftDisplayProps {
  employeeId: string
  date?: string
  showRotationInfo?: boolean
  compact?: boolean
}

interface ShiftInfo {
  id: string
  name: string
  shiftType: string
  mainWorkStart: string | null
  mainWorkEnd: string | null
  lunchBreakStart?: string | null
  lunchBreakEnd?: string | null
  workingDays?: string[]
}

interface RotationInfo {
  groupId: string
  groupName: string
  currentPhase: 'A' | 'B'
  anchorDate: string
  shiftA: ShiftInfo
  shiftB: ShiftInfo
}

interface ActiveShiftData {
  employee: {
    id: string
    employeeId: string
    name: string
  }
  activeShift: ShiftInfo
  rotationInfo: RotationInfo | null
  date: string
}

export function ActiveShiftDisplay({ 
  employeeId, 
  date = new Date().toISOString(),
  showRotationInfo = true,
  compact = false 
}: ActiveShiftDisplayProps) {
  const [shiftData, setShiftData] = useState<ActiveShiftData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchActiveShift = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch(
          `/api/employees/active-shift?employeeId=${employeeId}&date=${date}`
        )

        if (!response.ok) {
          throw new Error('Gagal mengambil data shift aktif')
        }

        const data = await response.json()
        setShiftData(data)
      } catch (err) {
        console.error('Error fetching active shift:', err)
        setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
      } finally {
        setIsLoading(false)
      }
    }

    fetchActiveShift()
  }, [employeeId, date])

  const formatTime = (timeString: string | null) => {
    if (!timeString) return '-'
    try {
      const date = new Date(timeString)
      return date.toLocaleTimeString('id-ID', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      })
    } catch {
      return '-'
    }
  }

  if (isLoading) {
    return (
      <div className={`animate-pulse ${compact ? 'py-2' : 'py-4'}`}>
        <div className="h-4 bg-gray-200 rounded mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-3/4"></div>
      </div>
    )
  }

  if (error || !shiftData) {
    return (
      <div className={`text-destructive ${compact ? 'text-sm' : ''}`}>
        {error || 'Data tidak tersedia'}
      </div>
    )
  }

  const { activeShift, rotationInfo } = shiftData

  if (compact) {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Badge variant={rotationInfo ? 'default' : 'secondary'} className="text-xs">
            {activeShift.name}
          </Badge>
          {rotationInfo && (
            <Badge variant="outline" className="text-xs">
              Fase {rotationInfo.currentPhase}
            </Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          {formatTime(activeShift.mainWorkStart)} - {formatTime(activeShift.mainWorkEnd)}
        </div>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4" />
          Shift Aktif
          {rotationInfo && <RotateCcw className="h-4 w-4 text-blue-600" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Informasi shift aktif */}
        <div className="bg-muted/30 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">{activeShift.name}</span>
            <Badge variant={rotationInfo ? 'default' : 'secondary'}>
              {activeShift.shiftType.replace('_', ' ')}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>
                <strong>Jam Kerja:</strong> {formatTime(activeShift.mainWorkStart)} - {formatTime(activeShift.mainWorkEnd)}
              </span>
              {activeShift.lunchBreakStart && activeShift.lunchBreakEnd && (
                <span>
                  <strong>Istirahat:</strong> {formatTime(activeShift.lunchBreakStart)} - {formatTime(activeShift.lunchBreakEnd)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Informasi rotasi jika ada */}
        {rotationInfo && showRotationInfo && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <RotateCcw className="h-4 w-4 text-blue-600" />
              <span>Grup Rotasi: {rotationInfo.groupName}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className={`p-2 rounded-lg border ${
                rotationInfo.currentPhase === 'A' 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-green-700">Shift A</span>
                  {rotationInfo.currentPhase === 'A' && (
                    <Badge variant="default" className="text-xs">Aktif</Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  <div>{rotationInfo.shiftA.name}</div>
                  <div>{formatTime(rotationInfo.shiftA.mainWorkStart)} - {formatTime(rotationInfo.shiftA.mainWorkEnd)}</div>
                </div>
              </div>

              <div className={`p-2 rounded-lg border ${
                rotationInfo.currentPhase === 'B' 
                  ? 'bg-blue-50 border-blue-200' 
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-blue-700">Shift B</span>
                  {rotationInfo.currentPhase === 'B' && (
                    <Badge variant="default" className="text-xs">Aktif</Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  <div>{rotationInfo.shiftB.name}</div>
                  <div>{formatTime(rotationInfo.shiftB.mainWorkStart)} - {formatTime(rotationInfo.shiftB.mainWorkEnd)}</div>
                </div>
              </div>
            </div>

            <div className="text-xs text-muted-foreground bg-blue-50 p-2 rounded-lg">
              <div className="flex items-center gap-1 mb-1">
                <Users className="h-3 w-3" />
                <span className="font-medium">Informasi Rotasi:</span>
              </div>
              <div>
                Dimulai: {format(new Date(rotationInfo.anchorDate), 'dd MMMM yyyy', { locale: id })}
              </div>
              <div>
                Rotasi setiap minggu pada hari Senin pukul 00:00
              </div>
            </div>
          </div>
        )}

        {/* Info tanggal */}
        <div className="text-xs text-muted-foreground pt-2 border-t">
          Data untuk: {format(new Date(date), 'dd MMMM yyyy', { locale: id })}
        </div>
      </CardContent>
    </Card>
  )
}
