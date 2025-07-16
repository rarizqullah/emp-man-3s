import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    // Create socket connection if it doesn't exist
    if (!socket) {
      socket = io(process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000', {
        path: '/api/socket/io',
        addTrailingSlash: false,
      })

      socket.on('connect', () => {
        console.log('Connected to socket server')
      })

      socket.on('disconnect', () => {
        console.log('Disconnected from socket server')
      })
    }

    socketRef.current = socket

    return () => {
      // Don't disconnect socket here, keep it alive for other components
    }
  }, [])

  return socketRef.current
}

export const useSocketEvent = (event: string, callback: (data: any) => void) => {
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
