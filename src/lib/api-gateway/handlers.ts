import { APIGatewayRequest, APIGatewayResponse, APIRouteHandler } from './types';
import { apiGateway } from './gateway';
import { z } from 'zod';

// Generic handler wrapper
export function createHandler<T = any>(
  handler: (req: APIGatewayRequest) => Promise<T>,
  options?: {
    requireAuth?: boolean;
    requireAdmin?: boolean;
    validation?: {
      body?: z.ZodSchema;
      params?: z.ZodSchema;
      query?: z.ZodSchema;
    };
  }
): APIRouteHandler {
  return async (req: APIGatewayRequest): Promise<APIGatewayResponse> => {
    try {
      // Validate request if validation schemas provided
      if (options?.validation) {
        if (options.validation.body && req.body) {
          try {
            req.body = options.validation.body.parse(req.body);
          } catch (error) {
            throw new Error(`Body validation failed: ${error.message}`);
          }
        }
        
        if (options.validation.params && req.params) {
          try {
            req.params = options.validation.params.parse(req.params);
          } catch (error) {
            throw new Error(`Params validation failed: ${error.message}`);
          }
        }
        
        if (options.validation.query && req.queryParams) {
          try {
            req.queryParams = options.validation.query.parse(req.queryParams);
          } catch (error) {
            throw new Error(`Query validation failed: ${error.message}`);
          }
        }
      }
      
      // Execute handler
      const data = await handler(req);
      
      return {
        success: true,
        data,
        message: 'Request processed successfully',
      };
    } catch (error) {
      // Let API Gateway handle the error
      throw error;
    }
  };
}

// Health check handler
export const healthHandler = createHandler(async (req: APIGatewayRequest) => {
  return await apiGateway.healthCheck();
});

// Metrics handler (admin only)
export const metricsHandler = createHandler(async (req: APIGatewayRequest) => {
  return apiGateway.getMetrics();
});

// Reset metrics handler (admin only)
export const resetMetricsHandler = createHandler(async (req: APIGatewayRequest) => {
  apiGateway.resetMetrics();
  return { message: 'Metrics reset successfully' };
});

// Configuration handler (admin only)
export const configHandler = createHandler(async (req: APIGatewayRequest) => {
  return apiGateway.getConfig();
});

// Routes info handler
export const routesHandler = createHandler(async (req: APIGatewayRequest) => {
  return {
    routes: apiGateway.getRegisteredRoutes(),
    total: apiGateway.getRegisteredRoutes().length,
  };
});

// Proxy handler untuk existing APIs
export const proxyHandler = (targetPath: string): APIRouteHandler => {
  return createHandler(async (req: APIGatewayRequest) => {
    const { method, nextUrl, headers, body } = req;
    
    // Build target URL
    const targetUrl = new URL(targetPath, nextUrl.origin);
    
    // Copy search params
    nextUrl.searchParams.forEach((value, key) => {
      targetUrl.searchParams.set(key, value);
    });
    
    // Prepare headers
    const fetchHeaders = new Headers();
    headers.forEach((value, key) => {
      // Skip host header and other headers that might cause issues
      if (!['host', 'content-length', 'transfer-encoding'].includes(key.toLowerCase())) {
        fetchHeaders.set(key, value);
      }
    });
    
    // Add user info if available
    if (req.user) {
      fetchHeaders.set('X-User-ID', req.user.id);
      fetchHeaders.set('X-User-Email', req.user.email);
      fetchHeaders.set('X-User-Role', req.user.role);
    }
    
    // Make request
    const response = await fetch(targetUrl.toString(), {
      method,
      headers: fetchHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`Proxy request failed: ${data.error || response.statusText}`);
    }
    
    return data;
  });
};

// Validation schemas for common endpoints
export const validationSchemas = {
  // Employee schemas
  employeeCreate: z.object({
    employeeId: z.string().min(1, 'Employee ID is required'),
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email format'),
    departmentId: z.string().min(1, 'Department ID is required'),
    subDepartmentId: z.string().optional(),
    positionId: z.string().min(1, 'Position ID is required'),
    shiftId: z.string().min(1, 'Shift ID is required'),
    gender: z.enum(['MALE', 'FEMALE']),
    address: z.string().optional(),
    contractType: z.enum(['PERMANENT', 'TRAINING']),
    contractNumber: z.string().optional(),
    contractStartDate: z.string().datetime().optional(),
    contractEndDate: z.string().datetime().optional(),
  }),
  
  employeeUpdate: z.object({
    name: z.string().min(1).optional(),
    email: z.string().email().optional(),
    departmentId: z.string().min(1).optional(),
    subDepartmentId: z.string().optional(),
    positionId: z.string().min(1).optional(),
    shiftId: z.string().min(1).optional(),
    gender: z.enum(['MALE', 'FEMALE']).optional(),
    address: z.string().optional(),
    contractType: z.enum(['PERMANENT', 'TRAINING']).optional(),
    contractNumber: z.string().optional(),
    contractStartDate: z.string().datetime().optional(),
    contractEndDate: z.string().datetime().optional(),
  }),
  
  // Department schemas
  departmentCreate: z.object({
    name: z.string().min(1, 'Department name is required'),
  }),
  
  departmentUpdate: z.object({
    name: z.string().min(1).optional(),
  }),
  
  // Attendance schemas
  attendanceCheckIn: z.object({
    employeeId: z.string().min(1, 'Employee ID is required'),
    faceData: z.string().optional(),
    location: z.object({
      latitude: z.number().optional(),
      longitude: z.number().optional(),
    }).optional(),
  }),
  
  attendanceCheckOut: z.object({
    employeeId: z.string().min(1, 'Employee ID is required'),
    faceData: z.string().optional(),
    location: z.object({
      latitude: z.number().optional(),
      longitude: z.number().optional(),
    }).optional(),
  }),
  
  // Auth schemas
  authLogin: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
  }),
  
  authRegister: z.object({
    fullName: z.string().min(1, 'Full name is required'),
    email: z.string().email('Invalid email format'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
  }),
  
  // Allowance schemas
  allowanceCreate: z.object({
    name: z.string().min(1, 'Allowance name is required'),
    description: z.string().optional(),
    applicableRule: z.string().min(1, 'Applicable rule is required'),
    umkAmount: z.number().min(0).optional(),
    companyPercentage: z.number().min(0).max(100).optional(),
    employeePercentage: z.number().min(0).max(100).optional(),
  }),
  
  allowanceUpdate: z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    applicableRule: z.string().min(1).optional(),
    umkAmount: z.number().min(0).optional(),
    companyPercentage: z.number().min(0).max(100).optional(),
    employeePercentage: z.number().min(0).max(100).optional(),
  }),
  
  // Common parameter schemas
  idParam: z.object({
    id: z.string().min(1, 'ID is required'),
  }),
  
  employeeIdParam: z.object({
    employeeId: z.string().min(1, 'Employee ID is required'),
  }),
  
  // Common query schemas
  paginationQuery: z.object({
    page: z.string().transform(val => parseInt(val, 10)).default('1'),
    limit: z.string().transform(val => parseInt(val, 10)).default('10'),
    search: z.string().optional(),
  }),
  
  departmentQuery: z.object({
    departmentId: z.string().optional(),
    search: z.string().optional(),
  }),
};

// Error handler wrapper
export function withErrorHandler<T extends any[]>(
  handler: (...args: T) => Promise<APIGatewayResponse>
): (...args: T) => Promise<APIGatewayResponse> {
  return async (...args: T): Promise<APIGatewayResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      console.error('Handler error:', error);
      
      return {
        success: false,
        error: error.message || 'Internal server error',
        message: 'An error occurred while processing your request',
      };
    }
  };
}

// Cache handler wrapper
export function withCache<T extends any[]>(
  handler: (...args: T) => Promise<APIGatewayResponse>,
  options: {
    key: string;
    ttl: number; // in milliseconds
  }
): (...args: T) => Promise<APIGatewayResponse> {
  const cache = new Map<string, { data: any; expires: number }>();
  
  return async (...args: T): Promise<APIGatewayResponse> => {
    const cacheKey = `${options.key}_${JSON.stringify(args)}`;
    const now = Date.now();
    
    // Check cache
    const cached = cache.get(cacheKey);
    if (cached && now < cached.expires) {
      return cached.data;
    }
    
    // Execute handler
    const result = await handler(...args);
    
    // Cache result if successful
    if (result.success) {
      cache.set(cacheKey, {
        data: result,
        expires: now + options.ttl,
      });
    }
    
    return result;
  };
}

// Rate limit handler wrapper
export function withRateLimit<T extends any[]>(
  handler: (...args: T) => Promise<APIGatewayResponse>,
  options: {
    windowMs: number;
    max: number;
    keyGenerator?: (...args: T) => string;
  }
): (...args: T) => Promise<APIGatewayResponse> {
  const store = new Map<string, { count: number; resetTime: number }>();
  
  return async (...args: T): Promise<APIGatewayResponse> => {
    const key = options.keyGenerator ? options.keyGenerator(...args) : 'default';
    const now = Date.now();
    
    const limit = store.get(key);
    
    if (!limit || now > limit.resetTime) {
      store.set(key, { count: 1, resetTime: now + options.windowMs });
      return await handler(...args);
    }
    
    if (limit.count >= options.max) {
      return {
        success: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests',
      };
    }
    
    limit.count++;
    return await handler(...args);
  };
}

// Pagination helper
export function paginate<T>(
  items: T[],
  page: number,
  limit: number
): {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
} {
  const total = items.length;
  const totalPages = Math.ceil(total / limit);
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const data = items.slice(startIndex, endIndex);
  
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}

// Response formatter helpers
export const formatResponse = {
  success: (data: any, message?: string): APIGatewayResponse => ({
    success: true,
    data,
    message: message || 'Request processed successfully',
  }),
  
  error: (error: string, message?: string): APIGatewayResponse => ({
    success: false,
    error,
    message: message || 'An error occurred',
  }),
  
  notFound: (message?: string): APIGatewayResponse => ({
    success: false,
    error: 'NOT_FOUND',
    message: message || 'Resource not found',
  }),
  
  unauthorized: (message?: string): APIGatewayResponse => ({
    success: false,
    error: 'UNAUTHORIZED',
    message: message || 'Unauthorized access',
  }),
  
  forbidden: (message?: string): APIGatewayResponse => ({
    success: false,
    error: 'FORBIDDEN',
    message: message || 'Access forbidden',
  }),
  
  validation: (errors: any, message?: string): APIGatewayResponse => ({
    success: false,
    error: 'VALIDATION_ERROR',
    message: message || 'Validation failed',
    data: errors,
  }),
}; 