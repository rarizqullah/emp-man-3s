import { NextRequest, NextResponse } from 'next/server';

// Extended request interface untuk API Gateway
export interface APIGatewayRequest {
  // Properties from NextRequest
  nextUrl: NextRequest['nextUrl'];
  headers: NextRequest['headers'];
  cookies: NextRequest['cookies'];
  method: NextRequest['method'];
  url: NextRequest['url'];
  
  // Extended properties
  user?: {
    id: string;
    email: string;
    role: string;
    name?: string;
  };
  params?: Record<string, string>;
  body?: any;
  startTime?: number;
  requestId?: string;
  queryParams?: Record<string, string | string[]>;
  
  // Methods from NextRequest
  json(): Promise<any>;
  text(): Promise<string>;
  arrayBuffer(): Promise<ArrayBuffer>;
  blob(): Promise<Blob>;
  formData(): Promise<FormData>;
  clone(): APIGatewayRequest;
}

// Standard response interface
export interface APIGatewayResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
  timestamp?: string;
  requestId?: string;
  executionTime?: number;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

// Error response interface
export interface APIGatewayError {
  success: false;
  error: string;
  message?: string;
  code?: string;
  details?: any;
  timestamp: string;
  requestId: string;
  statusCode: number;
}

// Middleware interface
export interface APIMiddleware {
  name: string;
  handler: (req: APIGatewayRequest, res: NextResponse) => Promise<APIGatewayRequest | NextResponse>;
  priority: number;
  enabled?: boolean;
}

// Route handler interface
export interface APIRouteHandler {
  (req: APIGatewayRequest): Promise<APIGatewayResponse>;
}

// Configuration interface
export interface APIGatewayConfig {
  version: string;
  basePath: string;
  cors: {
    origin: string[];
    methods: string[];
    headers: string[];
    credentials: boolean;
  };
  auth: {
    enabled: boolean;
    publicRoutes: string[];
    adminRoutes: string[];
    jwtSecret?: string;
  };
  rateLimit: {
    enabled: boolean;
    windowMs: number;
    max: number;
    message: string;
    standardHeaders: boolean;
    legacyHeaders: boolean;
  };
  logging: {
    enabled: boolean;
    level: 'error' | 'warn' | 'info' | 'debug';
    includeRequestBody: boolean;
    includeResponseBody: boolean;
  };
  validation: {
    enabled: boolean;
    strict: boolean;
    maxBodySize: number;
  };
  metrics: {
    enabled: boolean;
    collectUserMetrics: boolean;
    collectEndpointMetrics: boolean;
  };
}

// Metrics interface
export interface APIGatewayMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  requestsByEndpoint: Record<string, number>;
  requestsByUser: Record<string, number>;
  errorsByType: Record<string, number>;
  errorsByEndpoint: Record<string, number>;
  requestsByMethod: Record<string, number>;
  requestsByStatus: Record<string, number>;
  uptime: number;
  memoryUsage: NodeJS.MemoryUsage;
}

// Rate limiting store interface
export interface RateLimitEntry {
  count: number;
  resetTime: number;
  user?: string;
  endpoint?: string;
}

// Cache interface
export interface CacheEntry {
  data: any;
  expires: number;
  createdAt: number;
  key: string;
}

// Validation error interface
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
  code?: string;
}

// API Gateway context
export interface APIGatewayContext {
  request: APIGatewayRequest;
  response?: APIGatewayResponse;
  startTime: number;
  endTime?: number;
  errors: Array<Error | ValidationError>;
  metrics: Partial<APIGatewayMetrics>;
  cache: Map<string, CacheEntry>;
  rateLimits: Map<string, RateLimitEntry>;
}

// Health check response
export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  dependencies: {
    database: 'connected' | 'disconnected' | 'error';
    cache: 'available' | 'unavailable';
    external: Record<string, 'available' | 'unavailable'>;
  };
  metrics: {
    memoryUsage: NodeJS.MemoryUsage;
    activeConnections: number;
    requestsPerMinute: number;
  };
}

// Standard HTTP methods
export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD';

// Route definition
export interface APIRoute {
  path: string;
  method: HTTPMethod;
  handler: APIRouteHandler;
  middleware?: APIMiddleware[];
  auth?: boolean;
  adminOnly?: boolean;
  rateLimit?: {
    windowMs: number;
    max: number;
  };
  validation?: {
    body?: any;
    params?: any;
    query?: any;
  };
  cache?: {
    enabled: boolean;
    ttl: number;
    key?: string;
  };
  description?: string;
  tags?: string[];
}

// Error types
export type APIErrorType = 
  | 'VALIDATION_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'AUTHORIZATION_ERROR'
  | 'NOT_FOUND_ERROR'
  | 'RATE_LIMIT_ERROR'
  | 'INTERNAL_ERROR'
  | 'DATABASE_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT_ERROR'
  | 'UNKNOWN_ERROR'; 