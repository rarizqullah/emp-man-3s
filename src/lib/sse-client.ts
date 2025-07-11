"use client"

import { useDashboardStore } from './dashboard-store'

export interface SSEEvent {
  type: 'attendance-update' | 'check-in' | 'check-out' | 'leave-request' | 'notification' | 'heartbeat'
  data: unknown
  timestamp: string
}

class SSEClient {
  private eventSource: EventSource | null = null
  private reconnectTimeout: number | null = null
  private maxReconnectAttempts = 5
  private baseReconnectDelay = 1000 // Start with 1 second
  private isConnecting = false

  constructor(private url: string = '/api/events/stream') {}

  connect() {
    if (this.isConnecting || (this.eventSource && this.eventSource.readyState === EventSource.OPEN)) {
      return
    }

    this.isConnecting = true
    const store = useDashboardStore.getState()
    store.setConnectionStatus({ isConnected: false, isConnecting: true })

    try {
      this.eventSource = new EventSource(this.url)

      this.eventSource.onopen = () => {
        console.log('[SSE] Connected to event stream')
        this.isConnecting = false
        const store = useDashboardStore.getState()
        store.setConnectionStatus({ isConnected: true, isConnecting: false })
        store.resetReconnectAttempts()
        
        // Clear any pending reconnect timeout
        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout)
          this.reconnectTimeout = null
        }
      }

      this.eventSource.onmessage = (event) => {
        try {
          const sseEvent: SSEEvent = JSON.parse(event.data)
          this.handleEvent(sseEvent)
        } catch (error) {
          console.warn('[SSE] Failed to parse event data:', error)
        }
      }

      this.eventSource.onerror = (error) => {
        console.warn('[SSE] Connection error:', error)
        this.isConnecting = false
        const store = useDashboardStore.getState()
        store.setConnectionStatus({ isConnected: false, isConnecting: false })
        
        if (this.eventSource?.readyState === EventSource.CLOSED) {
          this.scheduleReconnect()
        }
      }

      // Setup custom event listeners
      this.setupEventListeners()

    } catch (error) {
      console.error('[SSE] Failed to create EventSource:', error)
      this.isConnecting = false
      const store = useDashboardStore.getState()
      store.setConnectionStatus({ isConnected: false, isConnecting: false })
      this.scheduleReconnect()
    }
  }

  private setupEventListeners() {
    if (!this.eventSource) return

    // Attendance stats update
    this.eventSource.addEventListener('attendance-stats', (event) => {
      try {
        const data = JSON.parse(event.data)
        const store = useDashboardStore.getState()
        store.setAttendanceStats(data)
      } catch (error) {
        console.warn('[SSE] Failed to parse attendance-stats:', error)
      }
    })

    // Recent activity update
    this.eventSource.addEventListener('recent-activity', (event) => {
      try {
        const activity = JSON.parse(event.data)
        const store = useDashboardStore.getState()
        store.addRecentActivity(activity)
      } catch (error) {
        console.warn('[SSE] Failed to parse recent-activity:', error)
      }
    })

    // Chart data update
    this.eventSource.addEventListener('chart-data', (event) => {
      try {
        const data = JSON.parse(event.data)
        const store = useDashboardStore.getState()
        store.setChartData(data)
      } catch (error) {
        console.warn('[SSE] Failed to parse chart-data:', error)
      }
    })

    // Notification
    this.eventSource.addEventListener('notification', (event) => {
      try {
        const notification = JSON.parse(event.data)
        const store = useDashboardStore.getState()
        store.addNotification(notification)
        
        // Play sound if enabled
        const { preferences } = store
        if (preferences.notificationSettings.playSound) {
          this.playNotificationSound()
        }
        
        // Show desktop notification if enabled and permission granted
        if (preferences.notificationSettings.showDesktop && 'Notification' in window) {
          this.showDesktopNotification(notification)
        }
      } catch (error) {
        console.warn('[SSE] Failed to parse notification:', error)
      }
    })

         // Heartbeat - throttle heartbeat updates to prevent infinite loops
     let lastHeartbeatUpdate = 0
     this.eventSource.addEventListener('heartbeat', () => {
       const now = Date.now()
       if (now - lastHeartbeatUpdate > 30000) { // Only update every 30 seconds
         const store = useDashboardStore.getState()
         store.updateHeartbeat()
         lastHeartbeatUpdate = now
       }
     })
  }

  private handleEvent(event: SSEEvent) {
    // Add debouncing to prevent rapid fire updates
    const store = useDashboardStore.getState()
    
    switch (event.type) {
      case 'heartbeat':
        // Heartbeat is handled separately with throttling
        break
      
      case 'attendance-update':
        if (event.data) {
          store.setAttendanceStats(event.data)
        }
        break
      
      case 'check-in':
      case 'check-out':
        if (event.data?.employeeName) {
          store.addRecentActivity({
            id: `${event.type}-${Date.now()}-${Math.random()}`,
            type: event.type,
            employeeName: event.data.employeeName,
            timestamp: new Date(event.timestamp),
            details: event.data.details
          })
        }
        break
      
      case 'leave-request':
        if (event.data?.employeeName) {
          store.addRecentActivity({
            id: `leave-${Date.now()}-${Math.random()}`,
            type: 'leave-request',
            employeeName: event.data.employeeName,
            timestamp: new Date(event.timestamp),
            details: event.data.details
          })
        }
        break
      
      case 'notification':
        if (event.data) {
          store.addNotification(event.data)
        }
        break
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
    }

    const store = useDashboardStore.getState()
    
    if (store.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('[SSE] Max reconnect attempts reached')
      store.addNotification({
        type: 'error',
        title: 'Connection Lost',
        message: 'Unable to reconnect to live updates. Please refresh the page.',
      })
      return
    }

    const delay = this.baseReconnectDelay * Math.pow(2, store.reconnectAttempts)
    console.log(`[SSE] Scheduling reconnect in ${delay}ms (attempt ${store.reconnectAttempts + 1})`)
    
    store.incrementReconnectAttempts()
    
    this.reconnectTimeout = window.setTimeout(() => {
      this.connect()
    }, delay)
  }

  private playNotificationSound() {
    try {
      // Create a subtle notification sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1)
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.5)
    } catch (error) {
      console.warn('[SSE] Failed to play notification sound:', error)
    }
  }

  private async showDesktopNotification(notification: any) {
    if (Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/logo.ico',
        badge: '/logo.ico',
        tag: notification.type
      })
    } else if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        this.showDesktopNotification(notification)
      }
    }
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }

    this.isConnecting = false
    const store = useDashboardStore.getState()
    store.setConnectionStatus({ isConnected: false, isConnecting: false })
    store.resetReconnectAttempts()
  }

  getConnectionState() {
    return {
      readyState: this.eventSource?.readyState,
      isConnecting: this.isConnecting
    }
  }
}

// Singleton instance
let sseClient: SSEClient | null = null

export const getSSEClient = () => {
  if (!sseClient) {
    sseClient = new SSEClient()
  }
  return sseClient
}

export const connectSSE = () => {
  const client = getSSEClient()
  client.connect()
  return client
}

export const disconnectSSE = () => {
  if (sseClient) {
    sseClient.disconnect()
  }
}

// Hook for React components
export const useSSE = () => {
  const client = getSSEClient()
  
  return {
    connect: () => client.connect(),
    disconnect: () => client.disconnect(),
    getConnectionState: () => client.getConnectionState()
  }
} 