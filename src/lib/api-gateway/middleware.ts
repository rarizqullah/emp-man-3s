import { NextRequest, NextResponse } from 'next/server';
import { APIGatewayRequest, APIMiddleware, RateLimitEntry } from './types';
import { API_GATEWAY_CONFIG, ENDPOINT_RATE_LIMITS, ALLOWED_HEADERS, RESPONSE_HEADERS } from './config';
import { getTokenFromRequest, verifyToken } from '../jwt-client';

// Helper function untuk membuat APIGatewayRequest dari NextRequest
function createAPIGatewayRequest(req: NextRequest): APIGatewayRequest {
  return {
    nextUrl: req.nextUrl,
    headers: req.headers,
    cookies: req.cookies,
    method: req.method,
    url: req.url,
    user: undefined,
    params: {},
    body: undefined,
    startTime: Date.now(),
    requestId: generateRequestId(),
    queryParams: {},
    json: () => req.json(),
    text: () => req.text(),
    arrayBuffer: () => req.arrayBuffer(),
    blob: () => req.blob(),
    formData: () => req.formData(),
    clone: () => createAPIGatewayRequest(req.clone()),
  };
}

// Helper function untuk generate request ID
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Helper function untuk extract query parameters
function extractQueryParams(req: NextRequest): Record<string, string | string[]> {
  const params: Record<string, string | string[]> = {};
  
  req.nextUrl.searchParams.forEach((value, key) => {
    if (params[key]) {
      if (Array.isArray(params[key])) {
        (params[key] as string[]).push(value);
      } else {
        params[key] = [params[key] as string, value];
      }
    } else {
      params[key] = value;
    }
  });
  
  return params;
}

// Helper function untuk check apakah route adalah public
function isPublicRoute(pathname: string): boolean {
  return API_GATEWAY_CONFIG.auth.publicRoutes.some(route => {
    if (route.includes('*')) {
      return pathname.startsWith(route.replace('*', ''));
    }
    return pathname === route;
  });
}

// Helper function untuk check apakah route adalah admin only
function isAdminRoute(pathname: string): boolean {
  return API_GATEWAY_CONFIG.auth.adminRoutes.some(route => {
    if (route.includes('*')) {
      return pathname.startsWith(route.replace('*', ''));
    }
    return pathname === route;
  });
}

// Helper function untuk get client IP
function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIP = req.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  return 'unknown';
}

// Rate limiting store - menggunakan Map sederhana untuk demo
// Dalam production, gunakan Redis atau database
const rateLimitStore = new Map<string, RateLimitEntry>();

// 1. CORS Middleware
export const corsMiddleware: APIMiddleware = {
  name: 'cors',
  priority: 0,
  enabled: true,
  handler: async (req: APIGatewayRequest, res: NextResponse): Promise<APIGatewayRequest | NextResponse> => {
    const origin = req.headers.get('origin');
    const method = req.method;
    
    // Handle preflight requests
    if (method === 'OPTIONS') {
      const response = new NextResponse(null, { status: 200 });
      
      // Set CORS headers
      response.headers.set('Access-Control-Allow-Origin', origin || '*');
      response.headers.set('Access-Control-Allow-Methods', API_GATEWAY_CONFIG.cors.methods.join(', '));
      response.headers.set('Access-Control-Allow-Headers', API_GATEWAY_CONFIG.cors.headers.join(', '));
      response.headers.set('Access-Control-Allow-Credentials', API_GATEWAY_CONFIG.cors.credentials.toString());
      response.headers.set('Access-Control-Max-Age', '86400');
      
      return response;
    }
    
    return req;
  },
};

// 2. Logging Middleware
export const loggingMiddleware: APIMiddleware = {
  name: 'logging',
  priority: 1,
  enabled: API_GATEWAY_CONFIG.logging.enabled,
  handler: async (req: APIGatewayRequest, res: NextResponse): Promise<APIGatewayRequest | NextResponse> => {
    const { level, includeRequestBody } = API_GATEWAY_CONFIG.logging;
    
    if (!API_GATEWAY_CONFIG.logging.enabled) {
      return req;
    }
    
    const logData = {
      requestId: req.requestId,
      method: req.method,
      url: req.url,
      pathname: req.nextUrl.pathname,
      timestamp: new Date().toISOString(),
      userAgent: req.headers.get('user-agent'),
      ip: getClientIP(req as NextRequest),
      userId: req.user?.id || 'anonymous',
    };
    
    // Log berdasarkan level
    if (level === 'debug' || level === 'info') {
      console.log(`[API Gateway] ${req.method} ${req.nextUrl.pathname}`, logData);
    }
    
    // Log request body jika diaktifkan
    if (includeRequestBody && (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH')) {
      try {
        const body = await req.json();
        req.body = body;
        
        if (level === 'debug') {
          console.log(`[API Gateway] Request body:`, body);
        }
      } catch (error) {
        // Ignore JSON parsing errors
      }
    }
    
    return req;
  },
};

// 3. Rate Limiting Middleware
export const rateLimitMiddleware: APIMiddleware = {
  name: 'rateLimit',
  priority: 2,
  enabled: API_GATEWAY_CONFIG.rateLimit.enabled,
  handler: async (req: APIGatewayRequest, res: NextResponse): Promise<APIGatewayRequest | NextResponse> => {
    if (!API_GATEWAY_CONFIG.rateLimit.enabled) {
      return req;
    }
    
    const clientIP = getClientIP(req as NextRequest);
    const pathname = req.nextUrl.pathname;
    const userId = req.user?.id;
    
    // Check endpoint-specific rate limits
    const endpointLimit = ENDPOINT_RATE_LIMITS[pathname];
    const config = endpointLimit || API_GATEWAY_CONFIG.rateLimit;
    
    // Create rate limit key
    const rateLimitKey = `${clientIP}:${pathname}${userId ? `:${userId}` : ''}`;
    
    const now = Date.now();
    const limit = rateLimitStore.get(rateLimitKey);
    
    if (!limit || now > limit.resetTime) {
      // Create new limit entry
      rateLimitStore.set(rateLimitKey, {
        count: 1,
        resetTime: now + config.windowMs,
        user: userId,
        endpoint: pathname,
      });
      
      return req;
    }
    
    if (limit.count >= config.max) {
      const retryAfter = Math.ceil((limit.resetTime - now) / 1000);
      
      const response = NextResponse.json(
        {
          success: false,
          error: 'RATE_LIMIT_EXCEEDED',
          message: config.message || 'Terlalu banyak permintaan',
          retryAfter,
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        },
        { status: 429 }
      );
      
      response.headers.set('X-RateLimit-Limit', config.max.toString());
      response.headers.set('X-RateLimit-Remaining', '0');
      response.headers.set('X-RateLimit-Reset', limit.resetTime.toString());
      response.headers.set('Retry-After', retryAfter.toString());
      
      return response;
    }
    
    // Increment count
    limit.count++;
    
    return req;
  },
};

// 4. Authentication Middleware
export const authMiddleware: APIMiddleware = {
  name: 'auth',
  priority: 3,
  enabled: API_GATEWAY_CONFIG.auth.enabled,
  handler: async (req: APIGatewayRequest, res: NextResponse): Promise<APIGatewayRequest | NextResponse> => {
    if (!API_GATEWAY_CONFIG.auth.enabled) {
      return req;
    }
    
    const pathname = req.nextUrl.pathname;
    
    // Skip authentication for public routes
    if (isPublicRoute(pathname)) {
      return req;
    }
    
    // Get token from request
    const token = getTokenFromRequest(req as NextRequest);
    
    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: 'AUTHENTICATION_ERROR',
          message: 'Token tidak tersedia',
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        },
        { status: 401 }
      );
    }
    
    // Verify token
    const payload = await verifyToken(token);
    
    if (!payload) {
      return NextResponse.json(
        {
          success: false,
          error: 'AUTHENTICATION_ERROR',
          message: 'Token tidak valid atau sudah expired',
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        },
        { status: 401 }
      );
    }
    
    // Check admin routes
    if (isAdminRoute(pathname)) {
      if (payload.role !== 'admin') {
        return NextResponse.json(
          {
            success: false,
            error: 'AUTHORIZATION_ERROR',
            message: 'Akses ditolak - Admin only',
            timestamp: new Date().toISOString(),
            requestId: req.requestId,
          },
          { status: 403 }
        );
      }
    }
    
    // Attach user info to request
    req.user = {
      id: payload.userId,
      email: payload.email,
      role: payload.role || 'user',
      name: payload.name,
    };
    
    return req;
  },
};

// 5. Validation Middleware
export const validationMiddleware: APIMiddleware = {
  name: 'validation',
  priority: 4,
  enabled: API_GATEWAY_CONFIG.validation.enabled,
  handler: async (req: APIGatewayRequest, res: NextResponse): Promise<APIGatewayRequest | NextResponse> => {
    if (!API_GATEWAY_CONFIG.validation.enabled) {
      return req;
    }
    
    // Extract query parameters
    req.queryParams = extractQueryParams(req as NextRequest);
    
    // Validate request body size
    const contentLength = req.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > API_GATEWAY_CONFIG.validation.maxBodySize) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Ukuran request body terlalu besar',
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        },
        { status: 413 }
      );
    }
    
    // Validate Content-Type for POST/PUT/PATCH
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      const contentType = req.headers.get('content-type');
      
      if (!contentType) {
        return NextResponse.json(
          {
            success: false,
            error: 'VALIDATION_ERROR',
            message: 'Content-Type header diperlukan untuk request ini',
            timestamp: new Date().toISOString(),
            requestId: req.requestId,
          },
          { status: 400 }
        );
      }
      
      // Parse JSON body jika belum diparsing
      if (contentType.includes('application/json') && !req.body) {
        try {
          const body = await req.json();
          req.body = body;
        } catch (error) {
          return NextResponse.json(
            {
              success: false,
              error: 'VALIDATION_ERROR',
              message: 'Invalid JSON body',
              timestamp: new Date().toISOString(),
              requestId: req.requestId,
            },
            { status: 400 }
          );
        }
      }
    }
    
    return req;
  },
};

// 6. Headers Middleware
export const headersMiddleware: APIMiddleware = {
  name: 'headers',
  priority: 5,
  enabled: true,
  handler: async (req: APIGatewayRequest, res: NextResponse): Promise<APIGatewayRequest | NextResponse> => {
    // Filter headers yang diizinkan
    const allowedHeaders = new Headers();
    
    ALLOWED_HEADERS.forEach(header => {
      const value = req.headers.get(header);
      if (value) {
        allowedHeaders.set(header, value);
      }
    });
    
    // Set request ID jika belum ada
    if (!req.requestId) {
      req.requestId = generateRequestId();
    }
    
    allowedHeaders.set('x-request-id', req.requestId);
    
    return req;
  },
};

// Export all middlewares as array
export const DEFAULT_MIDDLEWARES: APIMiddleware[] = [
  corsMiddleware,
  loggingMiddleware,
  rateLimitMiddleware,
  authMiddleware,
  validationMiddleware,
  headersMiddleware,
].filter(middleware => middleware.enabled !== false)
 .sort((a, b) => a.priority - b.priority);

// Helper function untuk membuat response dengan headers standar
export function createAPIResponse(
  data: any,
  status: number = 200,
  headers: Record<string, string> = {}
): NextResponse {
  const response = NextResponse.json(data, { status });
  
  // Set default headers
  Object.entries(RESPONSE_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  // Set custom headers
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
}

// Helper function untuk membuat error response
export function createErrorResponse(
  error: string,
  message: string,
  status: number = 500,
  requestId: string = generateRequestId(),
  details?: any
): NextResponse {
  const errorResponse = {
    success: false,
    error,
    message,
    timestamp: new Date().toISOString(),
    requestId,
    ...(details && { details }),
  };
  
  return createAPIResponse(errorResponse, status);
}

// Helper exports
export { createAPIGatewayRequest, generateRequestId, extractQueryParams, isPublicRoute, isAdminRoute, getClientIP }; 