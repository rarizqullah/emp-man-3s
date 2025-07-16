'use client'

import { ReactNode } from 'react'
import { SWRConfig } from 'swr'

const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) {
    const errorInfo = await response.text()
    throw new Error(`HTTP ${response.status}: ${errorInfo}`)
  }
  const result = await response.json()
  if (result.success === false) {
    throw new Error(result.error || 'API request failed')
  }
  return result.data || result
}

interface SWRProviderProps {
  children: ReactNode
}

export const SWRProvider = ({ children }: SWRProviderProps) => {
  return (
    <SWRConfig
      value={{
        fetcher,
        // Global SWR configuration
        refreshInterval: 0, // Disable automatic refresh by default
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        dedupingInterval: 2000, // Dedupe requests within 2 seconds
        errorRetryCount: 3,
        errorRetryInterval: 5000,
        loadingTimeout: 10000,
        focusThrottleInterval: 5000,
        // Fallback data when error occurs
        onError: (error, key) => {
          console.error('SWR Error:', error, 'Key:', key)
          // You can add global error handling here
          // For example, show a toast notification
        },
        onSuccess: (data, key) => {
          console.log('SWR Success:', key)
        },
        // Configure for real-time scenarios
        shouldRetryOnError: (error) => {
          // Don't retry on 4xx errors
          if (error.message.includes('4')) {
            return false
          }
          return true
        },
        // Configure cache
        provider: () => new Map(),
        isOnline: () => {
          return navigator.onLine
        },
        isVisible: () => {
          return document.visibilityState === 'visible'
        }
      }}
    >
      {children}
    </SWRConfig>
  )
}

export default SWRProvider
