import { APIGatewayConfig } from './types';

// Konfigurasi utama API Gateway
export const API_GATEWAY_CONFIG: APIGatewayConfig = {
  version: '1.0.0',
  basePath: '/api/gateway',
  cors: {
    origin: [
      'http://localhost:3000',
      'https://yourdomain.com',
      'https://emp-man-3s.vercel.app'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
    headers: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'X-CSRF-Token',
      'X-Request-ID'
    ],
    credentials: true,
  },
  auth: {
    enabled: true,
    publicRoutes: [
      '/api/gateway/health',
      '/api/gateway/auth/login',
      '/api/gateway/auth/register',
      '/api/gateway/departments-public',
      '/api/gateway/employees-public',
      '/api/gateway/sub-departments-public',
      '/api/gateway/attendance/today-public',
      '/api/gateway/face-recognition/test-recognition',
    ],
    adminRoutes: [
      '/api/gateway/admin/*',
      '/api/gateway/employees/bulk-*',
      '/api/gateway/configuration/*',
      '/api/gateway/salary-rates/*',
      '/api/gateway/debug/*',
      '/api/gateway/shifts/update-*',
      '/api/gateway/users/*',
      '/api/gateway/metrics',
    ],
    jwtSecret: process.env.JWT_SECRET || 'rahasia-jwt-untuk-aplikasi',
  },
  rateLimit: {
    enabled: true,
    windowMs: 15 * 60 * 1000, // 15 menit
    max: 100, // maksimal 100 requests per window
    message: 'Terlalu banyak permintaan dari IP ini, silakan coba lagi nanti.',
    standardHeaders: true,
    legacyHeaders: false,
  },
  logging: {
    enabled: true,
    level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
    includeRequestBody: process.env.NODE_ENV === 'development',
    includeResponseBody: false,
  },
  validation: {
    enabled: true,
    strict: false,
    maxBodySize: 10 * 1024 * 1024, // 10MB
  },
  metrics: {
    enabled: true,
    collectUserMetrics: true,
    collectEndpointMetrics: true,
  },
};

// Konfigurasi rate limiting khusus per endpoint
export const ENDPOINT_RATE_LIMITS = {
  '/api/gateway/auth/login': {
    windowMs: 15 * 60 * 1000, // 15 menit
    max: 5, // maksimal 5 percobaan login
  },
  '/api/gateway/auth/register': {
    windowMs: 60 * 60 * 1000, // 1 jam
    max: 3, // maksimal 3 registrasi per jam
  },
  '/api/gateway/attendance/check-in': {
    windowMs: 60 * 1000, // 1 menit
    max: 10, // maksimal 10 check-in per menit
  },
  '/api/gateway/attendance/check-out': {
    windowMs: 60 * 1000, // 1 menit
    max: 10, // maksimal 10 check-out per menit
  },
  '/api/gateway/face-recognition/*': {
    windowMs: 60 * 1000, // 1 menit
    max: 30, // maksimal 30 face recognition per menit
  },
  '/api/gateway/employees': {
    windowMs: 60 * 1000, // 1 menit
    max: 50, // maksimal 50 request per menit
  },
  '/api/gateway/attendance/list': {
    windowMs: 60 * 1000, // 1 menit
    max: 20, // maksimal 20 request per menit
  },
};

// Konfigurasi cache per endpoint
export const ENDPOINT_CACHE_CONFIG = {
  '/api/gateway/departments-public': {
    enabled: true,
    ttl: 5 * 60 * 1000, // 5 menit
  },
  '/api/gateway/employees-public': {
    enabled: true,
    ttl: 2 * 60 * 1000, // 2 menit
  },
  '/api/gateway/sub-departments-public': {
    enabled: true,
    ttl: 5 * 60 * 1000, // 5 menit
  },
  '/api/gateway/positions': {
    enabled: true,
    ttl: 10 * 60 * 1000, // 10 menit
  },
  '/api/gateway/shifts': {
    enabled: true,
    ttl: 5 * 60 * 1000, // 5 menit
  },
  '/api/gateway/allowances': {
    enabled: true,
    ttl: 3 * 60 * 1000, // 3 menit
  },
  '/api/gateway/attendance/today-public': {
    enabled: true,
    ttl: 30 * 1000, // 30 detik
  },
};

// Konfigurasi validasi khusus per endpoint
export const ENDPOINT_VALIDATION_CONFIG = {
  '/api/gateway/employees': {
    POST: {
      maxBodySize: 5 * 1024 * 1024, // 5MB untuk upload foto
      requiredFields: ['employeeId', 'name', 'email', 'departmentId'],
    },
    PUT: {
      maxBodySize: 5 * 1024 * 1024, // 5MB untuk upload foto
    },
  },
  '/api/gateway/attendance/check-in': {
    POST: {
      maxBodySize: 2 * 1024 * 1024, // 2MB untuk face data
      requiredFields: ['employeeId'],
    },
  },
  '/api/gateway/attendance/check-out': {
    POST: {
      maxBodySize: 2 * 1024 * 1024, // 2MB untuk face data
      requiredFields: ['employeeId'],
    },
  },
  '/api/gateway/face-recognition/process': {
    POST: {
      maxBodySize: 10 * 1024 * 1024, // 10MB untuk image processing
    },
  },
};

// Konfigurasi environment
export const ENVIRONMENT_CONFIG = {
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  apiVersion: '1.0.0',
  appName: 'Employee Management System',
  supportEmail: 'support@emp-man.com',
  maxRequestTimeout: 30000, // 30 detik
  maxConcurrentRequests: 100,
  enableDebugMode: process.env.DEBUG === 'true',
  enableMetrics: process.env.ENABLE_METRICS !== 'false',
  enableCaching: process.env.ENABLE_CACHING !== 'false',
  enableRateLimiting: process.env.ENABLE_RATE_LIMITING !== 'false',
};

// Headers yang diizinkan untuk diteruskan
export const ALLOWED_HEADERS = [
  'authorization',
  'content-type',
  'x-requested-with',
  'accept',
  'origin',
  'user-agent',
  'x-forwarded-for',
  'x-real-ip',
  'x-request-id',
  'x-correlation-id',
];

// Headers yang akan ditambahkan ke response
export const RESPONSE_HEADERS = {
  'X-API-Version': API_GATEWAY_CONFIG.version,
  'X-Powered-By': 'API Gateway',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

// Status codes yang digunakan
export const HTTP_STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

// Error messages yang digunakan
export const ERROR_MESSAGES = {
  INVALID_REQUEST: 'Permintaan tidak valid',
  UNAUTHORIZED: 'Tidak memiliki akses untuk endpoint ini',
  FORBIDDEN: 'Akses ditolak',
  NOT_FOUND: 'Endpoint tidak ditemukan',
  METHOD_NOT_ALLOWED: 'Method HTTP tidak diizinkan',
  RATE_LIMIT_EXCEEDED: 'Terlalu banyak permintaan',
  VALIDATION_ERROR: 'Data tidak valid',
  INTERNAL_ERROR: 'Terjadi kesalahan internal server',
  DATABASE_ERROR: 'Kesalahan database',
  NETWORK_ERROR: 'Kesalahan jaringan',
  TIMEOUT_ERROR: 'Request timeout',
  PAYLOAD_TOO_LARGE: 'Ukuran data terlalu besar',
} as const; 