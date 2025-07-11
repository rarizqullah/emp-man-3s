import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Types for dashboard data
export interface AttendanceStats {
  totalEmployees: number
  presentToday: number
  lateToday: number
  onLeave: number
  attendanceRate: number
  punctualityRate: number
}

export interface RecentActivity {
  id: string
  type: 'check-in' | 'check-out' | 'leave-request' | 'late-arrival'
  employeeName: string
  timestamp: Date
  details?: string
}

export interface ChartData {
  date: string
  present: number
  late: number
  absent: number
}

export interface Notification {
  id: string
  type: 'success' | 'warning' | 'error' | 'info'
  title: string
  message: string
  timestamp: Date
  isRead: boolean
  actionUrl?: string
}

export interface DashboardState {
  // Connection status
  isConnected: boolean
  isConnecting: boolean
  reconnectAttempts: number
  lastHeartbeat: Date | null

  // Data
  attendanceStats: AttendanceStats | null
  recentActivities: RecentActivity[]
  chartData: ChartData[]
  notifications: Notification[]

  // UI state
  selectedTab: string
  isNotificationOpen: boolean
  loadingStates: {
    stats: boolean
    activities: boolean
    charts: boolean
  }

  // User preferences (persisted)
  preferences: {
    refreshInterval: number
    chartDateRange: number
    notificationSettings: {
      playSound: boolean
      showDesktop: boolean
    }
  }

  // Actions
  setConnectionStatus: (status: { isConnected: boolean; isConnecting?: boolean }) => void
  incrementReconnectAttempts: () => void
  resetReconnectAttempts: () => void
  updateHeartbeat: () => void

  setAttendanceStats: (stats: AttendanceStats) => void
  addRecentActivity: (activity: RecentActivity) => void
  setRecentActivities: (activities: RecentActivity[]) => void
  setChartData: (data: ChartData[]) => void

  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>) => void
  markNotificationAsRead: (id: string) => void
  markAllNotificationsAsRead: () => void
  removeNotification: (id: string) => void

  setSelectedTab: (tab: string) => void
  setNotificationOpen: (open: boolean) => void
  setLoadingState: (key: keyof DashboardState['loadingStates'], loading: boolean) => void

  updatePreferences: (preferences: Partial<DashboardState['preferences']>) => void
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      // Initial state
      isConnected: false,
      isConnecting: false,
      reconnectAttempts: 0,
      lastHeartbeat: null,

      attendanceStats: null,
      recentActivities: [],
      chartData: [],
      notifications: [],

      selectedTab: 'overview',
      isNotificationOpen: false,
      loadingStates: {
        stats: false,
        activities: false,
        charts: false
      },

      preferences: {
        refreshInterval: 30000, // 30 seconds
        chartDateRange: 7, // 7 days
        notificationSettings: {
          playSound: true,
          showDesktop: true
        }
      },

      // Actions
      setConnectionStatus: (status) =>
        set((state) => ({
          isConnected: status.isConnected,
          isConnecting: status.isConnecting ?? state.isConnecting
        })),

      incrementReconnectAttempts: () =>
        set((state) => ({
          reconnectAttempts: state.reconnectAttempts + 1
        })),

      resetReconnectAttempts: () =>
        set({ reconnectAttempts: 0 }),

      updateHeartbeat: () =>
        set({ lastHeartbeat: new Date() }),

      setAttendanceStats: (stats) =>
        set({ attendanceStats: stats }),

      addRecentActivity: (activity) =>
        set((state) => ({
          recentActivities: [
            {
              ...activity,
              id: activity.id || `activity-${Date.now()}-${Math.random()}`
            },
            ...state.recentActivities.slice(0, 49) // Keep only latest 50
          ]
        })),

      setRecentActivities: (activities) =>
        set({ recentActivities: activities }),

      setChartData: (data) =>
        set({ chartData: data }),

      addNotification: (notification) =>
        set((state) => ({
          notifications: [
            {
              ...notification,
              id: `notif-${Date.now()}-${Math.random()}`,
              timestamp: new Date(),
              isRead: false
            },
            ...state.notifications.slice(0, 99) // Keep only latest 100
          ]
        })),

      markNotificationAsRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map(notif =>
            notif.id === id ? { ...notif, isRead: true } : notif
          )
        })),

      markAllNotificationsAsRead: () =>
        set((state) => ({
          notifications: state.notifications.map(notif => ({ ...notif, isRead: true }))
        })),

      removeNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter(notif => notif.id !== id)
        })),

      setSelectedTab: (tab) =>
        set({ selectedTab: tab }),

      setNotificationOpen: (open) =>
        set({ isNotificationOpen: open }),

      setLoadingState: (key, loading) =>
        set((state) => ({
          loadingStates: {
            ...state.loadingStates,
            [key]: loading
          }
        })),

      updatePreferences: (newPreferences) =>
        set((state) => ({
          preferences: {
            ...state.preferences,
            ...newPreferences
          }
        }))
    }),
    {
      name: 'dashboard-store',
      partialize: (state) => ({
        preferences: state.preferences,
        selectedTab: state.selectedTab
      })
    }
  )
)

// Optimized selectors to prevent unnecessary re-renders
export const useConnectionStatus = () => {
  const isConnected = useDashboardStore((state) => state.isConnected)
  const isConnecting = useDashboardStore((state) => state.isConnecting)
  const reconnectAttempts = useDashboardStore((state) => state.reconnectAttempts)
  const lastHeartbeat = useDashboardStore((state) => state.lastHeartbeat)
  
  return {
    isConnected,
    isConnecting,
    reconnectAttempts,
    lastHeartbeat
  }
}

export const useAttendanceStats = () =>
  useDashboardStore((state) => state.attendanceStats)

export const useRecentActivities = () =>
  useDashboardStore((state) => state.recentActivities)

export const useChartData = () =>
  useDashboardStore((state) => state.chartData)

export const useNotifications = () => {
  const notifications = useDashboardStore((state) => state.notifications)
  const unreadCount = useDashboardStore((state) => state.notifications.filter(n => !n.isRead).length)
  
  return {
    notifications,
    unreadCount
  }
}

export const useUIState = () => {
  const selectedTab = useDashboardStore((state) => state.selectedTab)
  const isNotificationOpen = useDashboardStore((state) => state.isNotificationOpen)
  const loadingStates = useDashboardStore((state) => state.loadingStates)
  
  return {
    selectedTab,
    isNotificationOpen,
    loadingStates
  }
}

export const usePreferences = () =>
  useDashboardStore((state) => state.preferences)

// Action selectors
export const useDashboardActions = () =>
  useDashboardStore((state) => ({
    setConnectionStatus: state.setConnectionStatus,
    incrementReconnectAttempts: state.incrementReconnectAttempts,
    resetReconnectAttempts: state.resetReconnectAttempts,
    updateHeartbeat: state.updateHeartbeat,
    setAttendanceStats: state.setAttendanceStats,
    addRecentActivity: state.addRecentActivity,
    setRecentActivities: state.setRecentActivities,
    setChartData: state.setChartData,
    addNotification: state.addNotification,
    markNotificationAsRead: state.markNotificationAsRead,
    markAllNotificationsAsRead: state.markAllNotificationsAsRead,
    removeNotification: state.removeNotification,
    setSelectedTab: state.setSelectedTab,
    setNotificationOpen: state.setNotificationOpen,
    setLoadingState: state.setLoadingState,
    updatePreferences: state.updatePreferences
  })) 