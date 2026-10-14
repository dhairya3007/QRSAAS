/**
 * Centralized API Client for Restaurant & Multi-Service SaaS Platform
 * Wraps fetch with automatic Bearer token injection, standardized error handling,
 * and 401 Unauthorized handling.
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'https://localhost:7180/api';

class ApiClient {
  constructor() {
    this.baseUrl = BASE_URL.replace(/\/+$/, '');
  }

  getAuthToken() {
    return localStorage.getItem('auth_token');
  }

  setAuthToken(token) {
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  clearAuthToken() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  }

  async request(endpoint, options = {}) {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    let url = `${this.baseUrl}${cleanEndpoint}`;

    // Append query params if provided
    if (options.params && typeof options.params === 'object') {
      const searchParams = new URLSearchParams();
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, value);
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += (url.includes('?') ? '&' : '?') + queryString;
      }
    }

    // Bust browser HTTP cache for GET requests to guarantee real-time updates across all sides
    const method = (options.method || 'GET').toUpperCase();
    if (method === 'GET') {
      url += (url.includes('?') ? '&' : '?') + `_t=${Date.now()}`;
    }

    const headers = { ...options.headers };

    // Prevent browser and proxy caching on all API requests
    headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
    headers['Pragma'] = 'no-cache';
    headers['Expires'] = '0';

    // Set JSON content-type if not already specified and not FormData
    const isFormData = options.body instanceof FormData;
    if (!isFormData && !headers['Content-Type'] && options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    // Attach Bearer token if available
    const token = this.getAuthToken();
    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      cache: 'no-store',
      ...options,
      headers,
    };

    if (options.body && !isFormData && typeof options.body === 'object') {
      config.body = JSON.stringify(options.body);
    }

    let response;
    try {
      response = await fetch(url, config);
    } catch (networkError) {
      console.error(`[API Network Error] ${options.method || 'GET'} ${url}:`, networkError);
      throw new Error(
        'Unable to reach backend server. Please make sure the ASP.NET Core API is running at ' +
          this.baseUrl
      );
    }

    // Handle 401 Unauthorized
    if (response.status === 401) {
      this.clearAuthToken();
      if (window.location.pathname !== '/login' && !window.location.pathname.startsWith('/setup/')) {
        window.location.href = '/login';
      }
      throw new Error('Your session has expired. Please log in again.');
    }

    // Parse response body
    let data = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        data = await response.json();
      } catch (parseError) {
        data = null;
      }
    } else {
      const text = await response.text();
      data = text ? { message: text } : null;
    }

    if (!response.ok) {
      let errorMessage = 'An error occurred while processing your request.';

      if (data) {
        if (data.message) {
          errorMessage = data.message;
        } else if (data.title) {
          errorMessage = data.title;
          if (data.errors && typeof data.errors === 'object') {
            const firstErrorKey = Object.keys(data.errors)[0];
            const errorList = data.errors[firstErrorKey];
            if (Array.isArray(errorList) && errorList.length > 0) {
              errorMessage = `${data.title}: ${errorList[0]}`;
            }
          }
        }
      } else if (response.statusText) {
        errorMessage = `HTTP ${response.status} ${response.statusText}`;
      }

      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  get(endpoint, params = {}, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET', params });
  }

  post(endpoint, body = {}, options = {}) {
    return this.request(endpoint, { ...options, method: 'POST', body });
  }

  put(endpoint, body = {}, options = {}) {
    return this.request(endpoint, { ...options, method: 'PUT', body });
  }

  patch(endpoint, body = {}, options = {}) {
    return this.request(endpoint, { ...options, method: 'PATCH', body });
  }

  delete(endpoint, params = {}, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE', params });
  }
}

export const apiClient = new ApiClient();
export default apiClient;
