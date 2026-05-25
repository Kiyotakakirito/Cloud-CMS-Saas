// Centralized API client with error handling, caching, and interceptors

import { getToken, logout } from './auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

// Request cache for deduplication
const requestCache = new Map();

interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  status: number;
}

interface ApiRequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean>;
  cacheKey?: string;
  cacheTTL?: number; // in milliseconds
  retry?: boolean;
}

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Global request interceptor
const requestInterceptor = (url: string, options: RequestInit): [string, RequestInit] => {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return [url, { ...options, headers }];
};

// Global response interceptor
const responseInterceptor = async (response: Response): Promise<Response> => {
  if (response.status === 401) {
    logout();
    throw new ApiError('Authentication required', 401);
  }

  if (response.status === 429) {
    throw new ApiError('Rate limit exceeded', 429);
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      errorData.detail || errorData.message || 'Request failed',
      response.status,
      errorData
    );
  }

  return response;
};

export async function apiRequest<T = any>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
  const {
    params,
    cacheKey,
    cacheTTL = 30000, // 30 seconds default
    retry = true,
    ...requestOptions
  } = options;

  // Build URL with query parameters
  let url = `${API_BASE}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    url += `?${searchParams.toString()}`;
  }

  // Check cache
  if (cacheKey && requestOptions.method === 'GET') {
    const cached = requestCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cacheTTL) {
      return { data: cached.data, status: 200 };
    }
  }

  try {
    const [finalUrl, finalOptions] = requestInterceptor(url, requestOptions);

    const response = await fetch(finalUrl, finalOptions);

    const processedResponse = await responseInterceptor(response);

    const data = await processedResponse.json();

    if (cacheKey && requestOptions.method === 'GET') {
      requestCache.set(cacheKey, {
        data,
        timestamp: Date.now(),
      });
    }

    return { data, status: response.status };
  } catch (error) {
    if (error instanceof ApiError) {
      return { error: error.message, status: error.status };
    }

    if (retry && requestOptions.method === 'GET') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return apiRequest<T>(endpoint, { ...options, retry: false });
    }

    return { error: 'Network error', status: 0 };
  }
}

// Convenience methods
export const api = {
  get: <T = any>(endpoint: string, options?: Omit<ApiRequestOptions, 'method'>) =>
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),

  post: <T = any>(endpoint: string, data?: any, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(endpoint, { ...options, method: 'POST', body: JSON.stringify(data) }),

  put: <T = any>(endpoint: string, data?: any, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(endpoint, { ...options, method: 'PUT', body: JSON.stringify(data) }),

  patch: <T = any>(endpoint: string, data?: any, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(endpoint, { ...options, method: 'PATCH', body: JSON.stringify(data) }),

  delete: <T = any>(endpoint: string, options?: Omit<ApiRequestOptions, 'method'>) =>
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),
};

// Clear cache utility
export const clearApiCache = (key?: string) => {
  if (key) {
    requestCache.delete(key);
  } else {
    requestCache.clear();
  }
};

// API endpoints - All endpoints EXCEPT Auth now strictly include trailing slashes
export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    LOGIN: '/auth/login/',
    LOGOUT: '/auth/logout/',
    ME: '/auth/me/',
    REFRESH: '/auth/refresh/',
  },

  // Customers
  CUSTOMERS: {
    LIST: '/customers/',
    CREATE: '/customers/',
    DETAIL: (id: number | string) => `/customers/${id}/`,
    PROFILE: (id: number | string) => `/customers/${id}/profile/`,
    UPDATE: (id: number | string) => `/customers/${id}/`,
    DELETE: (id: number | string) => `/customers/${id}/`,
    IMPORT: '/customers/import/',
  },

  // Billing
  BILLING: {
    PLANS: '/billing/plans/',
    INVOICES: '/billing/invoices/',
    CREATE_SINGLE_INVOICE: (id: number | string) => `/billing/invoices/create-single/?customer_id=${id}`,
    GENERATE_INVOICES: '/billing/invoices/generate-monthly/',
    RENEW: '/billing/renew/',
    CLEAR_OUTSTANDING: '/billing/clear-outstanding/',
    PAYMENTS: '/billing/payments/',
    RECORD_PAYMENT: '/billing/payments/record/',
    COLLECTIONS_ALL: '/billing/collections/all/',
    COLLECTIONS_OUTSTANDING: '/billing/collections/outstanding/',
    COLLECTIONS_SETTLED: '/billing/collections/settled/',
    EXPORT_COLLECTIONS: '/billing/collections/export/',
    RETRACT: (type: string, id: number | string) => `/billing/retract/${type}/${id}/`,
  },

  // Ticketing
  TICKETS: {
    LIST: '/ticketing/tickets/',
    CREATE: '/ticketing/tickets/',
    DETAIL: (id: number | string) => `/ticketing/tickets/${id}/`,
    UPDATE: (id: number | string) => `/ticketing/tickets/${id}/`,
  },

  // Outages
  OUTAGES: {
    LIST: '/ticketing/outages/',
    CREATE: '/ticketing/outages/',
    UPDATE: (id: number | string) => `/ticketing/outages/${id}/`,
  },

  // Analytics
  ANALYTICS: {
    DASHBOARD: '/analytics/dashboard-stats/',
    OWNER_METRICS: '/analytics/owner-metrics/',
    REPORTS: '/analytics/reports/',
  },

  // System
  SYSTEM: {
    HEALTH: '/health/',
    METRICS: '/metrics/',
    CONFIG: '/settings/',
  },

  // Tenants
  TENANTS: {
    LIST: '/tenants/',
    CREATE: '/tenants/',
    DETAIL: (id: number | string) => `/tenants/${id}/`,
    UPDATE: (id: number | string) => `/tenants/${id}/`,
    DELETE: (id: number | string) => `/tenants/${id}/`,
  },

  // Staff
  STAFF: {
    LIST: '/staff/',
    CREATE: '/staff/',
    DELETE: (id: string | number) => `/staff/${id}/`,
  },

  // Audit
  AUDIT: {
    LIST: '/audit/',
  },
};