// SSE Event Broadcasting Utility
// Use this to send events from API routes to connected SSE clients

import type { SSEEventType } from './sse-client'

// This will be populated by the SSE route
let connectionManager: any = null

// Initialize connection manager (called from SSE route)
export const initializeSSEBroadcaster = (manager: any) => {
  connectionManager = manager
}

// Get connection manager from the SSE endpoint
const getConnectionManager = async () => {
  if (connectionManager) return connectionManager

  try {
    // Import the connection manager from the API route
    const { connectionManager: manager } = await import('@/app/api/events/stream/route')
    connectionManager = manager
    return manager
  } catch (error) {
    console.error('[SSE Broadcaster] Failed to get connection manager:', error)
    return null
  }
}

// Broadcast event to all connected clients
export const broadcastEvent = async (eventType: SSEEventType, payload: any) => {
  try {
    const manager = await getConnectionManager()
    if (manager) {
      manager.broadcast(eventType, payload)
    } else {
      console.warn('[SSE Broadcaster] No connection manager available')
    }
  } catch (error) {
    console.error('[SSE Broadcaster] Failed to broadcast event:', error)
  }
}

// Broadcast event to specific connection
export const broadcastToConnection = async (
  connectionId: string, 
  eventType: SSEEventType, 
  payload: any
) => {
  try {
    const manager = await getConnectionManager()
    if (manager) {
      manager.broadcastToConnection(connectionId, eventType, payload)
    }
  } catch (error) {
    console.error('[SSE Broadcaster] Failed to broadcast to connection:', error)
  }
}

// Get active connection count
export const getActiveConnectionCount = async (): Promise<number> => {
  try {
    const manager = await getConnectionManager()
    return manager ? manager.getConnectionCount() : 0
  } catch (error) {
    console.error('[SSE Broadcaster] Failed to get connection count:', error)
    return 0
  }
}

// Convenience functions for common events
export const notifyAttendanceUpdate = (stats: any) => {
  return broadcastEvent('ATTENDANCE_UPDATE', { stats })
}

export const notifyEmployeeCheckin = (employee: any, timestamp: Date) => {
  return broadcastEvent('EMPLOYEE_CHECKIN', {
    employeeId: employee.id,
    employeeName: employee.name,
    department: employee.department?.name,
    checkInTime: timestamp.toISOString(),
    timestamp: timestamp.toISOString()
  })
}

export const notifyEmployeeCheckout = (employee: any, timestamp: Date) => {
  return broadcastEvent('EMPLOYEE_CHECKOUT', {
    employeeId: employee.id,
    employeeName: employee.name,
    department: employee.department?.name,
    checkOutTime: timestamp.toISOString(),
    timestamp: timestamp.toISOString()
  })
}

export const notifyLeaveRequest = (leaveRequest: any) => {
  return broadcastEvent('LEAVE_REQUEST', {
    id: leaveRequest.id,
    employeeName: leaveRequest.user?.name,
    type: leaveRequest.type,
    startDate: leaveRequest.startDate,
    endDate: leaveRequest.endDate,
    timestamp: new Date().toISOString()
  })
}

export const notifyLeaveApproved = (leaveRequest: any) => {
  return broadcastEvent('LEAVE_APPROVED', {
    id: leaveRequest.id,
    employeeName: leaveRequest.user?.name,
    type: leaveRequest.type,
    startDate: leaveRequest.startDate,
    endDate: leaveRequest.endDate,
    timestamp: new Date().toISOString()
  })
}

export const notifySystemAlert = (message: string, type: string = 'info') => {
  return broadcastEvent('SYSTEM_ALERT', {
    message,
    type,
    timestamp: new Date().toISOString()
  })
}

export const notifyStatsUpdate = (stats: any) => {
  return broadcastEvent('STATS_UPDATE', stats)
}

// Employee related notifications
export const notifyEmployeeAdded = (employee: any) => {
  return broadcastEvent('EMPLOYEE_ADDED', {
    id: employee.id,
    name: employee.user?.name || employee.name,
    department: employee.department?.name,
    position: employee.position?.name,
    timestamp: new Date().toISOString()
  })
}

export const notifyEmployeeUpdated = (employee: any) => {
  return broadcastEvent('EMPLOYEE_UPDATED', {
    id: employee.id,
    name: employee.user?.name || employee.name,
    department: employee.department?.name,
    position: employee.position?.name,
    timestamp: new Date().toISOString()
  })
} 