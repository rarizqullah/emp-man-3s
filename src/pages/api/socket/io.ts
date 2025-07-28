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
  // Check if socket server is already running
  if (res.socket.server.io) {
    console.log('Socket.IO server already running')
    res.end()
    return
  }

  console.log('Initializing Socket.IO server...')
  
  try {
    const io = new ServerIO(res.socket.server, {
      path: '/api/socket/io',
      addTrailingSlash: false,
      transports: ['polling', 'websocket'], // Prioritize polling untuk stability
      cors: {
        origin: process.env.NODE_ENV === 'production' 
          ? process.env.NEXT_PUBLIC_SITE_URL || false
          : ['http://localhost:3000'],
        methods: ['GET', 'POST'],
        credentials: true
      },
      
      // Enhanced connection configuration untuk mengatasi server errors
      pingTimeout: 20000, // Reduced dari 30s ke 20s  
      pingInterval: 10000, // Reduced dari 15s ke 10s
      connectTimeout: 20000, // Reduced dari 30s ke 20s
      allowEIO3: true,
      upgradeTimeout: 8000, // Reduced dari 10s ke 8s
      maxHttpBufferSize: 1e6, // 1MB limit
      serveClient: false,
      cookie: false,
      
      // Enhanced error handling configuration
      allowRequest: (req, callback) => {
        // Basic validation to prevent malformed requests
        try {
          callback(null, true);
        } catch (error) {
          console.error('Socket.IO allowRequest error:', error);
          callback('Request validation failed', false);
        }
      }
    });

    res.socket.server.io = io;

    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id)

      // Enhanced error handling untuk connection
      socket.on('error', (error) => {
        console.error(`Socket error for ${socket.id}:`, error.message || error);
        // Don't emit error back to prevent loops
      })

      // Join dashboard room untuk real-time updates
      socket.on('join-dashboard', () => {
        try {
          socket.join('dashboard')
          console.log(`Socket ${socket.id} joined dashboard room`)
        } catch (error) {
          console.error(`Error joining dashboard room for ${socket.id}:`, error);
        }
      })

      // Join activity room untuk activity updates
      socket.on('join-activities', () => {
        try {
          socket.join('activities')
          console.log(`Socket ${socket.id} joined activities room`)
        } catch (error) {
          console.error(`Error joining activities room for ${socket.id}:`, error);
        }
      })

      // Enhanced disconnect handling
      socket.on('disconnect', (reason) => {
        try {
          socket.leave('dashboard')
          socket.leave('activities')
          console.log(`Client disconnected: ${socket.id}, Reason: ${reason}`)
        } catch (error) {
          console.error(`Error during disconnect cleanup for ${socket.id}:`, error);
        }
      })

      // Add connection heartbeat untuk health monitoring
      socket.on('ping', (callback) => {
        try {
          if (typeof callback === 'function') {
            callback('pong')
          }
        } catch (error) {
          console.error(`Ping/pong error for ${socket.id}:`, error);
        }
      })
    })

    // Enhanced server-level error handling
    io.on('error', (error) => {
      console.error('Socket.IO server error:', error.message || error)
    })

    // Enhanced engine error handling
    io.engine.on('connection_error', (err) => {
      console.error('Socket.IO engine connection error:', {
        message: err.message,
        description: err.description,
        context: err.context,
        type: err.type
      })
    })

    // Handle initial client errors
    io.engine.on('initial_headers', (headers) => {
      try {
        // Add security headers
        headers['x-socket-server'] = 'emp-man-3s'
      } catch (error) {
        console.error('Error setting initial headers:', error);
      }
    })

    console.log('✅ Socket.IO server initialized successfully')

  } catch (error) {
    console.error('❌ Failed to initialize Socket.IO server:', error)
    
    // Return error response instead of crashing
    res.status(500).json({ 
      error: 'Failed to initialize Socket.IO server',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
    return
  }

  res.end()
}

export default SocketHandler
