import { APIGatewayResponse } from './api-gateway/types';

// API Gateway Client Configuration
interface APIGatewayClientConfig {
  baseUrl: string;
  timeout: number;
  defaultHeaders: Record<string, string>;
  enableRetry: boolean;
  maxRetries: number;
  retryDelay: number;
}

// Default configuration
const DEFAULT_CONFIG: APIGatewayClientConfig = {
  baseUrl: '/api/gateway',
  timeout: 30000, // 30 seconds
  defaultHeaders: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  enableRetry: true,
  maxRetries: 3,
  retryDelay: 1000, // 1 second
};

// Request options interface
interface RequestOptions {
  timeout?: number;
  headers?: Record<string, string>;
  retry?: boolean;
  maxRetries?: number;
  signal?: AbortSignal;
}

// API Gateway Client Class
export class APIGatewayClient {
  private config: APIGatewayClientConfig;
  private authToken: string | null = null;

  constructor(config: Partial<APIGatewayClientConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.loadAuthToken();
  }

  // Load auth token from localStorage
  private loadAuthToken(): void {
    if (typeof window !== 'undefined') {
      this.authToken = localStorage.getItem('token');
    }
  }

  // Set auth token
  public setAuthToken(token: string): void {
    this.authToken = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
    }
  }

  // Clear auth token
  public clearAuthToken(): void {
    this.authToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
    }
  }

  // Get auth token
  public getAuthToken(): string | null {
    return this.authToken;
  }

  // Build request headers
  private buildHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
    const headers = {
      ...this.config.defaultHeaders,
      ...customHeaders,
    };

    // Add auth token if available
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    // Add request ID for tracking
    headers['X-Request-ID'] = this.generateRequestId();

    return headers;
  }

  // Generate request ID
  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Sleep function for retry delay
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Make HTTP request with retry logic
  private async makeRequest<T>(
    method: string,
    endpoint: string,
    options: RequestOptions & { body?: any } = {}
  ): Promise<APIGatewayResponse & { data: T }> {
    const {
      timeout = this.config.timeout,
      headers = {},
      retry = this.config.enableRetry,
      maxRetries = this.config.maxRetries,
      body,
      signal,
    } = options;

    const url = `${this.config.baseUrl}${endpoint}`;
    const requestHeaders = this.buildHeaders(headers);

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // Use provided signal or create new one
    const requestSignal = signal || controller.signal;

    let lastError: Error | null = null;
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        const requestConfig: RequestInit = {
          method,
          headers: requestHeaders,
          signal: requestSignal,
        };

        // Add body for POST/PUT/PATCH requests
        if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
          requestConfig.body = JSON.stringify(body);
        }

        const response = await fetch(url, requestConfig);

        clearTimeout(timeoutId);

        // Parse response
        const responseData = await response.json();

        // Handle HTTP errors
        if (!response.ok) {
          const error = new Error(responseData.message || `HTTP ${response.status}`);
          (error as any).status = response.status;
          (error as any).code = responseData.error;
          (error as any).details = responseData.details;
          throw error;
        }

        // Return successful response
        return responseData as APIGatewayResponse & { data: T };

      } catch (error) {
        lastError = error as Error;
        attempt++;

        // Log error for debugging
        console.error(`[API Gateway Client] Attempt ${attempt} failed:`, error);

        // Check if we should retry
        if (attempt > maxRetries || !retry || !this.shouldRetry(error as Error)) {
          break;
        }

        // Wait before retry
        await this.sleep(this.config.retryDelay * attempt);
      }
    }

    // Clear timeout if still active
    clearTimeout(timeoutId);

    // Throw the last error
    throw lastError || new Error('Request failed after all retries');
  }

  // Check if error should trigger retry
  private shouldRetry(error: Error): boolean {
    // Retry on network errors, timeout, and specific HTTP status codes
    if (error.name === 'AbortError') {
      return false; // Don't retry on user-initiated aborts
    }

    const status = (error as any).status;
    if (status) {
      // Retry on server errors (5xx) and rate limiting (429)
      return status >= 500 || status === 429;
    }

    // Retry on network errors
    return true;
  }

  // HTTP Method wrappers
  public async get<T = any>(endpoint: string, options: RequestOptions = {}): Promise<APIGatewayResponse & { data: T }> {
    return this.makeRequest<T>('GET', endpoint, options);
  }

  public async post<T = any>(endpoint: string, body?: any, options: RequestOptions = {}): Promise<APIGatewayResponse & { data: T }> {
    return this.makeRequest<T>('POST', endpoint, { ...options, body });
  }

  public async put<T = any>(endpoint: string, body?: any, options: RequestOptions = {}): Promise<APIGatewayResponse & { data: T }> {
    return this.makeRequest<T>('PUT', endpoint, { ...options, body });
  }

  public async delete<T = any>(endpoint: string, options: RequestOptions = {}): Promise<APIGatewayResponse & { data: T }> {
    return this.makeRequest<T>('DELETE', endpoint, options);
  }

  public async patch<T = any>(endpoint: string, body?: any, options: RequestOptions = {}): Promise<APIGatewayResponse & { data: T }> {
    return this.makeRequest<T>('PATCH', endpoint, { ...options, body });
  }

  // Authentication methods
  public async login(email: string, password: string): Promise<{ user: any; token: string }> {
    const response = await this.post<{ user: any; token: string }>('/auth/login', { email, password });
    
    if (response.success && response.data.token) {
      this.setAuthToken(response.data.token);
    }
    
    return response.data;
  }

  public async register(fullName: string, email: string, password: string): Promise<{ user: any }> {
    const response = await this.post<{ user: any }>('/auth/register', { fullName, email, password });
    return response.data;
  }

  public async logout(): Promise<void> {
    this.clearAuthToken();
  }

  // Resource-specific methods
  public async getEmployees(search?: string): Promise<any[]> {
    const endpoint = search ? `/employees?search=${encodeURIComponent(search)}` : '/employees';
    const response = await this.get<any[]>(endpoint);
    return response.data;
  }

  public async getEmployee(id: string): Promise<any> {
    const response = await this.get<any>(`/employees/${id}`);
    return response.data;
  }

  public async createEmployee(employeeData: any): Promise<any> {
    const response = await this.post<any>('/employees', employeeData);
    return response.data;
  }

  public async updateEmployee(id: string, employeeData: any): Promise<any> {
    const response = await this.put<any>(`/employees/${id}`, employeeData);
    return response.data;
  }

  public async deleteEmployee(id: string): Promise<void> {
    await this.delete(`/employees/${id}`);
  }

  public async getDepartments(): Promise<any[]> {
    const response = await this.get<any[]>('/departments');
    return response.data;
  }

  public async createDepartment(departmentData: any): Promise<any> {
    const response = await this.post<any>('/departments', departmentData);
    return response.data;
  }

  public async updateDepartment(id: string, departmentData: any): Promise<any> {
    const response = await this.put<any>(`/departments/${id}`, departmentData);
    return response.data;
  }

  public async deleteDepartment(id: string): Promise<void> {
    await this.delete(`/departments/${id}`);
  }

  public async getAllowances(): Promise<any[]> {
    const response = await this.get<any[]>('/allowances');
    return response.data;
  }

  public async createAllowance(allowanceData: any): Promise<any> {
    const response = await this.post<any>('/allowances', allowanceData);
    return response.data;
  }

  public async updateAllowance(id: string, allowanceData: any): Promise<any> {
    const response = await this.put<any>(`/allowances/${id}`, allowanceData);
    return response.data;
  }

  public async deleteAllowance(id: string): Promise<void> {
    await this.delete(`/allowances/${id}`);
  }

  public async getShifts(): Promise<any[]> {
    const response = await this.get<any[]>('/shifts');
    return response.data;
  }

  public async getPositions(): Promise<any[]> {
    const response = await this.get<any[]>('/positions');
    return response.data;
  }

  public async getSubDepartments(): Promise<any[]> {
    const response = await this.get<any[]>('/sub-departments');
    return response.data;
  }

  // Attendance methods
  public async checkIn(employeeId: string, faceData?: string): Promise<any> {
    const response = await this.post<any>('/attendance/check-in', { employeeId, faceData });
    return response.data;
  }

  public async checkOut(employeeId: string, faceData?: string): Promise<any> {
    const response = await this.post<any>('/attendance/check-out', { employeeId, faceData });
    return response.data;
  }

  public async getAttendanceList(params?: { page?: number; limit?: number; search?: string }): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    
    const endpoint = `/attendance/list${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await this.get<any>(endpoint);
    return response.data;
  }

  public async getTodayAttendance(): Promise<any> {
    const response = await this.get<any>('/attendance/today');
    return response.data;
  }

  // System methods
  public async getHealth(): Promise<any> {
    const response = await this.get<any>('/health');
    return response.data;
  }

  public async getMetrics(): Promise<any> {
    const response = await this.get<any>('/admin/metrics');
    return response.data;
  }

  // Update configuration
  public updateConfig(newConfig: Partial<APIGatewayClientConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Get current configuration
  public getConfig(): APIGatewayClientConfig {
    return { ...this.config };
  }
}

// Create singleton instance
export const apiGatewayClient = new APIGatewayClient();

// Export for convenience
export default apiGatewayClient; 