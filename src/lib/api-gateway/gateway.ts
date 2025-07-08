import { NextRequest, NextResponse } from 'next/server';
import { APIGatewayRequest, APIGatewayResponse, APIMiddleware, APIGatewayMetrics, APIRouteHandler } from './types';
import { DEFAULT_MIDDLEWARES, createAPIGatewayRequest, createAPIResponse, createErrorResponse } from './middleware';
import { API_GATEWAY_CONFIG } from './config';

// API Gateway Class
export class APIGateway {
  private middlewares: APIMiddleware[] = [];
  private routes: Map<string, APIRouteHandler> = new Map();
  private metrics: APIGatewayMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    requestsByEndpoint: {},
    requestsByUser: {},
    errorsByType: {},
    errorsByEndpoint: {},
    requestsByMethod: {},
    requestsByStatus: {},
    uptime: 0, // Edge Runtime compatible
    memoryUsage: { rss: 0, heapTotal: 0, heapUsed: 0, external: 0, arrayBuffers: 0 }, // Mock for Edge Runtime
  };
  private startTime: number = Date.now();

  constructor() {
    this.initializeMiddlewares();
  }

  // Initialize default middlewares
  private initializeMiddlewares(): void {
    this.middlewares = [...DEFAULT_MIDDLEWARES];
    console.log(`[API Gateway] Initialized with ${this.middlewares.length} middlewares`);
  }

  // Add custom middleware
  public addMiddleware(middleware: APIMiddleware): void {
    this.middlewares.push(middleware);
    this.middlewares.sort((a, b) => a.priority - b.priority);
    console.log(`[API Gateway] Added middleware: ${middleware.name}`);
  }

  // Remove middleware
  public removeMiddleware(name: string): void {
    this.middlewares = this.middlewares.filter(m => m.name !== name);
    console.log(`[API Gateway] Removed middleware: ${name}`);
  }

  // Register route handler
  public registerRoute(path: string, method: string, handler: APIRouteHandler): void {
    const routeKey = `${method.toUpperCase()}:${path}`;
    this.routes.set(routeKey, handler);
    console.log(`[API Gateway] Registered route: ${routeKey}`);
  }

  // Unregister route handler
  public unregisterRoute(path: string, method: string): void {
    const routeKey = `${method.toUpperCase()}:${path}`;
    this.routes.delete(routeKey);
    console.log(`[API Gateway] Unregistered route: ${routeKey}`);
  }

  // Get registered routes
  public getRegisteredRoutes(): string[] {
    return Array.from(this.routes.keys());
  }

  // Main request handler
  public async handleRequest(
    request: NextRequest,
    handler?: APIRouteHandler
  ): Promise<NextResponse> {
    const startTime = Date.now();
    let apiRequest: APIGatewayRequest | null = null;
    
    try {
      // Update metrics
      this.updateRequestMetrics(request);
      
      // Convert NextRequest to APIGatewayRequest
      apiRequest = createAPIGatewayRequest(request);
      
      // Process middlewares
      const middlewareResult = await this.processMiddlewares(apiRequest, request);
      
      // If middleware returned a response, return it
      if (middlewareResult instanceof NextResponse) {
        this.updateResponseMetrics(middlewareResult.status, startTime);
        return middlewareResult;
      }
      
      // Update request with middleware results
      apiRequest = middlewareResult;
      
      // Find and execute handler
      const routeHandler = handler || this.findRouteHandler(apiRequest);
      
      if (!routeHandler) {
        const errorResponse = createErrorResponse(
          'NOT_FOUND_ERROR',
          `Route ${apiRequest.method} ${apiRequest.nextUrl.pathname} tidak ditemukan`,
          404,
          apiRequest.requestId
        );
        this.updateResponseMetrics(404, startTime);
        return errorResponse;
      }
      
      // Execute handler
      const response = await routeHandler(apiRequest);
      
      // Process response
      const processedResponse = this.processResponse(response, apiRequest, startTime);
      
      // Update success metrics
      this.updateSuccessMetrics(startTime, apiRequest);
      
      return createAPIResponse(processedResponse, 200);
      
    } catch (error) {
      console.error('[API Gateway] Error processing request:', error);
      
      // Update error metrics
      this.updateErrorMetrics(error, apiRequest, startTime);
      
      // Create error response
      const errorResponse = this.createErrorResponseFromException(error, apiRequest);
      
      return errorResponse;
    }
  }

  // Process middlewares
  private async processMiddlewares(
    apiRequest: APIGatewayRequest,
    originalRequest: NextRequest
  ): Promise<APIGatewayRequest | NextResponse> {
    let currentRequest = apiRequest;
    
    for (const middleware of this.middlewares) {
      if (middleware.enabled === false) {
        continue;
      }
      
      try {
        const result = await middleware.handler(currentRequest, NextResponse.next());
        
        if (result instanceof NextResponse) {
          // Middleware returned a response (error or redirect)
          return result;
        }
        
        currentRequest = result;
      } catch (error) {
        console.error(`[API Gateway] Middleware ${middleware.name} error:`, error);
        
        return createErrorResponse(
          'MIDDLEWARE_ERROR',
          `Error dalam middleware ${middleware.name}`,
          500,
          currentRequest.requestId,
          { middlewareName: middleware.name }
        );
      }
    }
    
    return currentRequest;
  }

  // Find route handler
  private findRouteHandler(request: APIGatewayRequest): APIRouteHandler | null {
    const method = request.method;
    const pathname = request.nextUrl.pathname;
    
    // Try exact match first
    const exactKey = `${method}:${pathname}`;
    if (this.routes.has(exactKey)) {
      return this.routes.get(exactKey)!;
    }
    
    // Try pattern matching for dynamic routes
    for (const [routeKey, handler] of this.routes.entries()) {
      const [routeMethod, routePath] = routeKey.split(':');
      
      if (routeMethod === method && this.matchPath(pathname, routePath)) {
        // Extract path parameters
        const params = this.extractPathParams(pathname, routePath);
        request.params = params;
        return handler;
      }
    }
    
    return null;
  }

  // Match path with pattern
  private matchPath(pathname: string, pattern: string): boolean {
    const patternParts = pattern.split('/').filter(Boolean);
    const pathParts = pathname.split('/').filter(Boolean);
    
    if (patternParts.length !== pathParts.length) {
      return false;
    }
    
    for (let i = 0; i < patternParts.length; i++) {
      const patternPart = patternParts[i];
      const pathPart = pathParts[i];
      
      if (patternPart.startsWith(':') || patternPart.startsWith('[')) {
        // Dynamic parameter, skip validation
        continue;
      }
      
      if (patternPart !== pathPart) {
        return false;
      }
    }
    
    return true;
  }

  // Extract path parameters
  private extractPathParams(pathname: string, pattern: string): Record<string, string> {
    const params: Record<string, string> = {};
    const patternParts = pattern.split('/').filter(Boolean);
    const pathParts = pathname.split('/').filter(Boolean);
    
    for (let i = 0; i < patternParts.length; i++) {
      const patternPart = patternParts[i];
      const pathPart = pathParts[i];
      
      if (patternPart.startsWith(':')) {
        const paramName = patternPart.substring(1);
        params[paramName] = pathPart;
      } else if (patternPart.startsWith('[') && patternPart.endsWith(']')) {
        const paramName = patternPart.substring(1, patternPart.length - 1);
        params[paramName] = pathPart;
      }
    }
    
    return params;
  }

  // Process response
  private processResponse(
    response: APIGatewayResponse,
    request: APIGatewayRequest,
    startTime: number
  ): APIGatewayResponse {
    const executionTime = Date.now() - startTime;
    
    return {
      ...response,
      timestamp: new Date().toISOString(),
      requestId: request.requestId,
      executionTime,
    };
  }

  // Create error response from exception
  private createErrorResponseFromException(
    error: any,
    request: APIGatewayRequest | null
  ): NextResponse {
    const requestId = request?.requestId || `error-${Date.now()}`;
    
    // Handle different error types
    if (error.name === 'ValidationError') {
      return createErrorResponse(
        'VALIDATION_ERROR',
        error.message || 'Validation error',
        400,
        requestId,
        error.details
      );
    }
    
    if (error.name === 'UnauthorizedError') {
      return createErrorResponse(
        'AUTHENTICATION_ERROR',
        'Tidak memiliki akses',
        401,
        requestId
      );
    }
    
    if (error.name === 'ForbiddenError') {
      return createErrorResponse(
        'AUTHORIZATION_ERROR',
        'Akses ditolak',
        403,
        requestId
      );
    }
    
    if (error.name === 'NotFoundError') {
      return createErrorResponse(
        'NOT_FOUND_ERROR',
        'Resource tidak ditemukan',
        404,
        requestId
      );
    }
    
    // Default internal server error
    return createErrorResponse(
      'INTERNAL_ERROR',
      'Terjadi kesalahan internal server',
      500,
      requestId,
      API_GATEWAY_CONFIG.logging.level === 'debug' ? error.stack : undefined
    );
  }

  // Update request metrics
  private updateRequestMetrics(request: NextRequest): void {
    this.metrics.totalRequests++;
    this.metrics.requestsByMethod[request.method] = (this.metrics.requestsByMethod[request.method] || 0) + 1;
    this.metrics.requestsByEndpoint[request.nextUrl.pathname] = (this.metrics.requestsByEndpoint[request.nextUrl.pathname] || 0) + 1;
    this.metrics.uptime = (Date.now() - this.startTime) / 1000;
    // Edge Runtime compatible - skip memory usage tracking
  }

  // Update response metrics
  private updateResponseMetrics(status: number, startTime: number): void {
    this.metrics.requestsByStatus[status] = (this.metrics.requestsByStatus[status] || 0) + 1;
    
    if (status >= 200 && status < 300) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }
    
    this.updateAverageResponseTime(startTime);
  }

  // Update success metrics
  private updateSuccessMetrics(startTime: number, request: APIGatewayRequest): void {
    this.metrics.successfulRequests++;
    this.metrics.requestsByStatus[200] = (this.metrics.requestsByStatus[200] || 0) + 1;
    
    if (request.user?.id) {
      this.metrics.requestsByUser[request.user.id] = (this.metrics.requestsByUser[request.user.id] || 0) + 1;
    }
    
    this.updateAverageResponseTime(startTime);
  }

  // Update error metrics
  private updateErrorMetrics(error: any, request: APIGatewayRequest | null, startTime: number): void {
    this.metrics.failedRequests++;
    
    const errorType = error.name || 'UnknownError';
    this.metrics.errorsByType[errorType] = (this.metrics.errorsByType[errorType] || 0) + 1;
    
    if (request) {
      this.metrics.errorsByEndpoint[request.nextUrl.pathname] = (this.metrics.errorsByEndpoint[request.nextUrl.pathname] || 0) + 1;
    }
    
    this.updateAverageResponseTime(startTime);
  }

  // Update average response time
  private updateAverageResponseTime(startTime: number): void {
    const responseTime = Date.now() - startTime;
    const totalRequests = this.metrics.totalRequests;
    
    if (totalRequests === 1) {
      this.metrics.averageResponseTime = responseTime;
    } else {
      this.metrics.averageResponseTime = 
        ((this.metrics.averageResponseTime * (totalRequests - 1)) + responseTime) / totalRequests;
    }
  }

  // Get metrics
  public getMetrics(): APIGatewayMetrics {
    return {
      ...this.metrics,
      uptime: (Date.now() - this.startTime) / 1000,
      // Edge Runtime compatible - return mock memory usage
      memoryUsage: { rss: 0, heapTotal: 0, heapUsed: 0, external: 0, arrayBuffers: 0 },
    };
  }

  // Reset metrics
  public resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      requestsByEndpoint: {},
      requestsByUser: {},
      errorsByType: {},
      errorsByEndpoint: {},
      requestsByMethod: {},
      requestsByStatus: {},
      uptime: (Date.now() - this.startTime) / 1000,
      // Edge Runtime compatible - mock memory usage
      memoryUsage: { rss: 0, heapTotal: 0, heapUsed: 0, external: 0, arrayBuffers: 0 },
    };
    console.log('[API Gateway] Metrics reset');
  }

  // Get configuration
  public getConfig(): typeof API_GATEWAY_CONFIG {
    return API_GATEWAY_CONFIG;
  }

  // Health check
  public async healthCheck(): Promise<any> {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: (Date.now() - this.startTime) / 1000,
      version: API_GATEWAY_CONFIG.version,
      metrics: this.getMetrics(),
      config: {
        middlewares: this.middlewares.map(m => ({ name: m.name, enabled: m.enabled })),
        routes: this.getRegisteredRoutes(),
      },
    };
  }
}

// Singleton instance
export const apiGateway = new APIGateway();

// Export utility functions
export * from './middleware';
export * from './types';
export * from './config'; 