'use client'

import { createContext, useContext, useEffect, ReactNode } from 'react'
import { io, Socket } from 'socket.io-client'

interface SocketContextType {
  socket: Socket | null
}

const SocketContext = createContext<SocketContextType>({ socket: null })

let socket: Socket | null = null

export const useSocketContext = () => {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocketContext must be used within a SocketProvider')
  }
  return context
}

interface SocketProviderProps {
  children: ReactNode
}

export const SocketProvider = ({ children }: SocketProviderProps) => {
  useEffect(() => {
    // Initialize socket connection dengan enhanced error handling
    if (!socket) {
      const socketUrl = process.env.NODE_ENV === 'production' 
        ? window.location.origin 
        : 'http://localhost:3000'
      
      console.log('🔌 Initializing Socket.IO connection to:', socketUrl)
      
      socket = io(socketUrl, {
        path: '/api/socket/io',
        addTrailingSlash: false,
        autoConnect: true,
        reconnection: true,
        
        // Enhanced configuration untuk mengatasi server errors
        reconnectionDelay: 3000, // Increased dari 2000 untuk stability
        reconnectionAttempts: 2, // Reduced dari 3 untuk faster failover
        timeout: 8000, // Reduced dari 10000 untuk faster timeout detection
        transports: ['polling'], // Hanya gunakan polling untuk avoid websocket issues
        forceNew: false,
        upgrade: false, // Disable upgrade to websocket untuk avoid server errors
        
        // Enhanced query parameters untuk debugging
        query: {
          timestamp: Date.now(),
          version: '1.0'
        }
      });

      // Enhanced connection event handlers
      socket.on('connect', () => {
        console.log('✅ Connected to Socket.IO server:', socket?.id)
      })

      socket.on('disconnect', (reason) => {
        console.log('🔌 Disconnected from Socket.IO server:', reason)
        
        // Enhanced disconnect handling
        if (reason === 'io server disconnect') {
          // Server initiated disconnect, try to reconnect
          console.log('🔄 Server disconnected, attempting reconnect...')
          socket?.connect()
        } else if (reason === 'transport error') {
          console.log('🌐 Transport error detected, will auto-reconnect')
        }
      })

      // Enhanced error handling untuk mengatasi server errors
      socket.on('connect_error', (error) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const errorInfo = error as any; // Type assertion untuk extended error properties
        
        console.error('❌ Socket.IO connection error:', {
          message: error.message,
          description: errorInfo.description || 'No description',
          context: errorInfo.context || 'No context',  
          type: errorInfo.type || 'Unknown type'
        })
        
        // Don't spam console dengan full error object
      })

      socket.on('reconnect', (attemptNumber) => {
        console.log(`🔄 Reconnected to Socket.IO server (attempt ${attemptNumber})`)
      })

      socket.on('reconnect_error', (error) => {
        console.error('❌ Socket.IO reconnection error:', error.message)
      })

      socket.on('reconnect_failed', () => {
        console.error('❌ Socket.IO reconnection failed after all attempts')
      })

      // Enhanced server error handling
      socket.on('error', (error) => {
        console.error('❌ Socket.IO server error:', error)
        
        // Handle specific server errors
        if (typeof error === 'string' && error.includes('server error')) {
          console.log('🔄 Server error detected, connection will be handled automatically')
        }
      })

      // Handle custom events that might cause server errors
      socket.on('server_error', (errorData) => {
        console.error('❌ Custom server error received:', errorData)
      })

      // Ping/pong untuk connection health monitoring
      const pingInterval = setInterval(() => {
        if (socket?.connected) {
          socket.emit('ping', (response: string) => {
            if (response !== 'pong') {
              console.warn('⚠️ Unexpected ping response:', response)
            }
          })
        }
      }, 30000) // Every 30 seconds

      // Cleanup ping interval on component unmount
      return () => {
        clearInterval(pingInterval)
      }
    }

    return () => {
      // Clean up on unmount if needed
      // Note: Don't disconnect here untuk persist connection across components
    }
  }, [])

  const value = {
    socket
  }

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  )
}

export default SocketProvider
