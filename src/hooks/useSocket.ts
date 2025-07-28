import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    // Create socket connection if it doesn't exist with improved configuration
    if (!socket) {
      socket = io(process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000', {
        path: '/api/socket/io',
        addTrailingSlash: false,
        transports: ['polling', 'websocket'], // Prioritize polling untuk stability
        timeout: 10000, // Reduced timeout
        reconnection: true,
        reconnectionAttempts: 3, // Reduced attempts
        reconnectionDelay: 2000, // Increased delay
      })

      socket.on('connect', () => {
        console.log('Connected to socket server:', socket?.id)
      })

      socket.on('disconnect', (reason) => {
        console.log('Disconnected from socket server:', reason)
      })

      // Handle errors gracefully
      socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error.message)
      })

      socket.on('error', (error) => {
        console.error('Socket error:', error)
      })
    }

    socketRef.current = socket

    return () => {
      // Keep socket alive for other components
    }
  }, [])

  return socketRef.current
}

export const useSocketEvent = (event: string, callback: (data: unknown) => void) => {
  const socket = useSocket()

  useEffect(() => {
    if (socket) {
      socket.on(event, callback)
      
      return () => {
        socket.off(event, callback)
      }
    }
  }, [socket, event, callback])
}

export default useSocket
