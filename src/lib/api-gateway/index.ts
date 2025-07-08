// API Gateway Entry Point
export * from './types';
export * from './config';
export * from './middleware';
export * from './gateway';
export * from './handlers';

// Main exports
export { apiGateway } from './gateway';
export { API_GATEWAY_CONFIG } from './config';
export { 
  DEFAULT_MIDDLEWARES,
  createAPIGatewayRequest,
  createAPIResponse,
  createErrorResponse 
} from './middleware';
export { 
  createHandler,
  healthHandler,
  metricsHandler,
  proxyHandler,
  validationSchemas,
  formatResponse
} from './handlers';

// Quick setup function
export async function setupAPIGateway() {
  console.log('🚀 Setting up API Gateway...');
  
  // Register default system routes
  const { apiGateway } = await import('./gateway');
  const { healthHandler, metricsHandler, resetMetricsHandler, configHandler, routesHandler } = await import('./handlers');
  
  // Health check route
  apiGateway.registerRoute('/health', 'GET', healthHandler);
  
  // Admin routes
  apiGateway.registerRoute('/admin/metrics', 'GET', metricsHandler);
  apiGateway.registerRoute('/admin/metrics/reset', 'POST', resetMetricsHandler);
  apiGateway.registerRoute('/admin/config', 'GET', configHandler);
  apiGateway.registerRoute('/admin/routes', 'GET', routesHandler);
  
  console.log('✅ API Gateway setup complete');
  
  return apiGateway;
} 