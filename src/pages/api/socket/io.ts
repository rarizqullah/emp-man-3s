import { Server as NetServer } from 'http'
import { NextApiRequest, NextApiResponse } from 'next'
import { Server as ServerIO } from 'socket.io'

export type NextApiResponseServerIO = NextApiResponse & {
  socket: any & {
    server: NetServer & {
      io: ServerIO
    }
  }
}

const SocketHandler = (req: NextApiRequest, res: NextApiResponseServerIO) => {
  if (res.socket.server.io) {
    console.log('Socket is already running')
    res.end()
    return
  }

  console.log('Socket is initializing')
  const io = new ServerIO(res.socket.server, {
    path: '/api/socket/io',
    addTrailingSlash: false,
    transports: ['polling', 'websocket'], // Specify transports
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? false 
        : ['http://localhost:3000'],
      methods: ['GET', 'POST'],
      credentials: true
    },
    // Add connection configuration
    pingTimeout: 60000,
    pingInterval: 25000,
    connectTimeout: 60000,
    // Handle polling errors gracefully
    allowEIO3: true
  })

  res.socket.server.io = io

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id)

    // Join dashboard room for real-time updates
    socket.on('join-dashboard', () => {
      socket.join('dashboard')
      console.log(`Socket ${socket.id} joined dashboard room`)
    })

    // Join activity room for activity updates
    socket.on('join-activities', () => {
      socket.join('activities')
      console.log(`Socket ${socket.id} joined activities room`)
    })

    // Handle connection errors
    socket.on('error', (error) => {
      console.error('Socket error for', socket.id, ':', error)
    })

    // Leave rooms on disconnect
    socket.on('disconnect', (reason) => {
      socket.leave('dashboard')
      socket.leave('activities')
      console.log('Client disconnected:', socket.id, 'Reason:', reason)
    })
  })

  // Handle server errors
  io.on('error', (error) => {
    console.error('Socket.io server error:', error)
  })

  res.end()
}

export default SocketHandler
