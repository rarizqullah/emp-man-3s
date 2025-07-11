import { NextRequest } from 'next/server'

interface SSEConnection {
  controller: ReadableStreamDefaultController<Uint8Array>
  encoder: TextEncoder
  id: string
  cleanup?: () => void
}

// Store active SSE connections
const connections = new Map<string, SSEConnection>()

// Heartbeat interval (30 seconds)  
const HEARTBEAT_INTERVAL = 30000

// Helper function to create SSE response
function createSSEResponse() {
  const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()
      
      // Store the connection
      connections.set(connectionId, {
        controller,
        encoder,
        id: connectionId
      })
      
      // Send initial connection message
      const welcomeMessage = `data: ${JSON.stringify({
        type: 'connected',
        timestamp: new Date().toISOString(),
        message: 'Connected to dashboard stream'
      })}\n\n`
      
      try {
        controller.enqueue(encoder.encode(welcomeMessage))
      } catch (error) {
        console.warn('[SSE] Failed to send welcome message:', error)
      }
      
      // Setup heartbeat
      const heartbeatInterval = setInterval(() => {
        try {
          const heartbeat = `event: heartbeat\ndata: ${JSON.stringify({
            timestamp: new Date().toISOString()
          })}\n\n`
          controller.enqueue(encoder.encode(heartbeat))
        } catch {
          console.warn('[SSE] Heartbeat failed')
          clearInterval(heartbeatInterval)
          connections.delete(connectionId)
        }
      }, HEARTBEAT_INTERVAL)
      
      // Cleanup function
      const cleanup = () => {
        clearInterval(heartbeatInterval)
        connections.delete(connectionId)
        try {
          controller.close()
        } catch {
          // Connection already closed
        }
      }
      
      // Store cleanup in connection for later use
      connections.get(connectionId)!.cleanup = cleanup
    },
    
    cancel() {
      // Connection closed by client
      const connection = connections.get(connectionId)
      if (connection?.cleanup) {
        connection.cleanup()
      }
    }
  })
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  })
}

// Broadcast function for sending events to all connected clients
export function broadcastToClients(event: string, data: unknown) {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  
  const deadConnections: string[] = []
  
  connections.forEach((connection, id) => {
    try {
      connection.controller.enqueue(connection.encoder.encode(message))
    } catch {
      console.warn(`[SSE] Failed to write to connection: ${id}`)
      deadConnections.push(id)
    }
  })
  
  // Clean up dead connections
  deadConnections.forEach(id => {
    const connection = connections.get(id)
    if (connection?.cleanup) {
      connection.cleanup()
    }
    connections.delete(id)
  })
  
  console.log(`[SSE] Broadcasted ${event} to ${connections.size} clients`)
}

// GET handler for SSE connections
export async function GET() {
  console.log('[SSE] New client connected')
  return createSSEResponse()
}

// POST handler for sending events (used by other API endpoints)
export async function POST(request: NextRequest) {
  try {
    const { event, data } = await request.json()
    
    if (!event || !data) {
      return Response.json(
        { error: 'Missing event or data' },
        { status: 400 }
      )
    }
    
    // Broadcast the event to all connected clients
    broadcastToClients(event, data)
    
    return Response.json({
      success: true,
      message: `Event '${event}' broadcasted to ${connections.size} clients`
    })
  } catch (error) {
    console.error('[SSE] Error handling POST request:', error)
    return Response.json(
      { error: 'Failed to process event' },
      { status: 500 }
    )
  }
}

// Status endpoint to check connection count
export async function OPTIONS() {
  return Response.json({
    connections: connections.size,
    timestamp: new Date().toISOString()
  })
}

 