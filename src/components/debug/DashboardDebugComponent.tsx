'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Database, TestTube } from 'lucide-react'

interface DebugResult {
  success: boolean
  data?: any
  error?: string
  details?: string
}

export default function DashboardDebugComponent() {
  const [dbResult, setDbResult] = useState<DebugResult | null>(null)
  const [dashboardResult, setDashboardResult] = useState<DebugResult | null>(null)
  const [testDashboardResult, setTestDashboardResult] = useState<DebugResult | null>(null)
  const [loading, setLoading] = useState({ db: false, dashboard: false, testDashboard: false })

  const testDatabase = async () => {
    setLoading(prev => ({ ...prev, db: true }))
    try {
      const response = await fetch('/api/debug/test-db')
      const result = await response.json()
      setDbResult(result)
    } catch (error) {
      setDbResult({
        success: false,
        error: 'Network error',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setLoading(prev => ({ ...prev, db: false }))
    }
  }

  const testDashboardAPI = async () => {
    setLoading(prev => ({ ...prev, dashboard: true }))
    try {
      const response = await fetch('/api/analytics/dashboard-v2?days=7')
      const result = await response.json()
      setDashboardResult(result)
    } catch (error) {
      setDashboardResult({
        success: false,
        error: 'Network error',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setLoading(prev => ({ ...prev, dashboard: false }))
    }
  }

  const testDashboardWithoutAuth = async () => {
    setLoading(prev => ({ ...prev, testDashboard: true }))
    try {
      const response = await fetch('/api/debug/test-dashboard?days=7')
      const result = await response.json()
      setTestDashboardResult(result)
    } catch (error) {
      setTestDashboardResult({
        success: false,
        error: 'Network error',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setLoading(prev => ({ ...prev, testDashboard: false }))
    }
  }

  const ResultCard = ({ title, result, icon: Icon }: { title: string, result: DebugResult | null, icon: any }) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {result ? (
          <div className="space-y-2">
            <Badge variant={result.success ? "default" : "destructive"}>
              {result.success ? "Success" : "Failed"}
            </Badge>
            {result.success && result.data && (
              <div className="text-sm">
                <pre className="bg-muted p-2 rounded text-xs overflow-auto max-h-40">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </div>
            )}
            {!result.success && (
              <div className="text-sm text-destructive">
                <p><strong>Error:</strong> {result.error}</p>
                {result.details && <p><strong>Details:</strong> {result.details}</p>}
              </div>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">Click test button to run</p>
        )}
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Dashboard Debug Tools</h2>
        <p className="text-muted-foreground">Test dashboard components to identify issues</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-4">
          <Button 
            onClick={testDatabase} 
            disabled={loading.db}
            className="w-full"
          >
            {loading.db ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Database className="h-4 w-4 mr-2" />}
            Test Database
          </Button>
          <ResultCard title="Database Connection" result={dbResult} icon={Database} />
        </div>

        <div className="space-y-4">
          <Button 
            onClick={testDashboardAPI} 
            disabled={loading.dashboard}
            className="w-full"
          >
            {loading.dashboard ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <TestTube className="h-4 w-4 mr-2" />}
            Test Dashboard API
          </Button>
          <ResultCard title="Dashboard API (with Auth)" result={dashboardResult} icon={TestTube} />
        </div>

        <div className="space-y-4">
          <Button 
            onClick={testDashboardWithoutAuth} 
            disabled={loading.testDashboard}
            className="w-full"
          >
            {loading.testDashboard ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <TestTube className="h-4 w-4 mr-2" />}
            Test Dashboard (No Auth)
          </Button>
          <ResultCard title="Dashboard API (without Auth)" result={testDashboardResult} icon={TestTube} />
        </div>
      </div>
    </div>
  )
}
