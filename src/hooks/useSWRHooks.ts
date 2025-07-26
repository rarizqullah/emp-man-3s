import useSWR from 'swr'
import { useCallback } from 'react'

const fetcher = async (url: string) => {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`HTTP ${response.status} error for ${url}:`, errorText)
      
      // Try to parse error response
      let errorMessage = `HTTP ${response.status}: Failed to fetch data`
      try {
        const errorData = JSON.parse(errorText)
        errorMessage = errorData.error || errorData.message || errorMessage
      } catch {
        // Use default error message if parsing fails
      }
      
      throw new Error(errorMessage)
    }
    
    const result = await response.json()
    
    // Handle different API response formats
    if (result.success === false) {
      throw new Error(result.error || result.details || 'Failed to fetch data')
    }
    
    // For APIs that return { success: true, data: ... }
    if (result.success === true && result.data) {
      return result.data
    }
    
    // For APIs that return data directly (without success wrapper)
    if (result && typeof result === 'object' && result.success === undefined && !result.error) {
      return result
    }
    
    // Return the data field if available, otherwise return the whole result
    return result.data || result
  } catch (error) {
    console.error('Fetcher error:', error)
    throw error
  }
}

// Dashboard data hook with SWR
export const useDashboardData = (subDepartmentId?: string, days: string = '7') => {
  const params = new URLSearchParams()
  if (subDepartmentId && subDepartmentId !== 'all') {
    params.append('subDepartmentId', subDepartmentId)
  }
  params.append('days', days)
  
  const key = `/api/analytics/dashboard-v2?${params}`
  
  const { data, error, isLoading, mutate } = useSWR(key, fetcher, {
    refreshInterval: 30000, // Refresh every 30 seconds
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 10000, // Dedupe requests within 10 seconds
    errorRetryCount: 3,
    errorRetryInterval: 2000,
    fallbackData: null, // Provide fallback data
    shouldRetryOnError: (error) => {
      // Don't retry on 4xx errors (client errors) or specific server errors
      if (error?.message?.includes('HTTP 4')) {
        return false
      }
      if (error?.message?.includes('Authentication required')) {
        return false
      }
      if (error?.message?.includes('connection pool')) {
        return true // Retry connection pool errors
      }
      return true
    },
    onError: (error) => {
      console.error('Dashboard data fetch error:', {
        message: error?.message || 'Unknown error',
        url: key,
        timestamp: new Date().toISOString()
      })
    },
    onSuccess: (data) => {
      console.log('Dashboard data fetch success:', {
        hasData: !!data,
        stats: data?.stats,
        chartDataLength: data?.chartData?.punctualityTrend?.length || 0,
        subDepartmentsCount: data?.subDepartments?.length || 0
      })
    }
  })

  const refresh = useCallback(() => {
    console.log('Manually refreshing dashboard data')
    mutate()
  }, [mutate])

  return {
    data,
    error: error?.message,
    isLoading,
    refresh,
    mutate
  }
}

// Activities data hook with SWR
export const useActivitiesData = (limit: number = 10) => {
  const key = `/api/activities?limit=${limit}`
  
  const { data, error, isLoading, mutate } = useSWR(key, fetcher, {
    refreshInterval: 15000, // Refresh every 15 seconds
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 5000, // Dedupe requests within 5 seconds
    errorRetryCount: 3,
    errorRetryInterval: 1000,
    onError: (error) => {
      console.error('Activities data fetch error:', error)
    }
  })

  const refresh = useCallback(() => {
    mutate()
  }, [mutate])

  return {
    data,
    error: error?.message,
    isLoading,
    refresh,
    mutate
  }
}

// Attendance data hook with SWR
export const useAttendanceData = () => {
  const key = '/api/attendance/today'
  
  const { data, error, isLoading, mutate } = useSWR(key, fetcher, {
    refreshInterval: 30000, // Refresh every 30 seconds
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 10000,
    errorRetryCount: 3,
    errorRetryInterval: 2000,
    onError: (error) => {
      console.error('Attendance data fetch error:', error)
    }
  })

  const refresh = useCallback(() => {
    mutate()
  }, [mutate])

  return {
    data,
    error: error?.message,
    isLoading,
    refresh,
    mutate
  }
}
