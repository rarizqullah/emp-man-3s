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
    // Initialize socket connection
    if (!socket) {
      const socketUrl = process.env.NODE_ENV === 'production' 
        ? window.location.origin 
        : 'http://localhost:3000'
      
      socket = io(socketUrl, {
        path: '/api/socket/io',
        addTrailingSlash: false,
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        timeout: 20000,
      })

      socket.on('connect', () => {
        console.log('🔗 Connected to Socket.io server:', socket?.id)
      })

      socket.on('disconnect', (reason) => {
        console.log('🔌 Disconnected from Socket.io server:', reason)
      })

      socket.on('connect_error', (error) => {
        console.error('❌ Socket.io connection error:', error)
      })

      socket.on('reconnect', (attemptNumber) => {
        console.log(`🔄 Reconnected to Socket.io server (attempt ${attemptNumber})`)
      })
    }

    return () => {
      // Don't disconnect here, let the socket persist across component unmounts
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
