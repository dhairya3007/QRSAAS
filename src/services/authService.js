import apiClient from './apiClient';

/**
 * Authentication & Session Management Service
 * Integrates with ASP.NET Core Identity & JWT Controller (/api/Auth/*)
 */
export const authService = {
  /**
   * Logs in a user (Super Admin or Client)
   * @param {string} email
   * @param {string} password
   * @returns {Promise<Object>} user object
   */
  login: async (email, password) => {
    if (!email || !password) {
      throw new Error('Email and password are required.');
    }

    const data = await apiClient.post('/Auth/login', {
      email: email.trim(),
      password,
    });

    if (!data || !data.token) {
      throw new Error('Invalid response from server.');
    }

    // Save token
    apiClient.setAuthToken(data.token);

    // Normalize user object so existing frontend logic expecting 'super_admin' or 'client' works seamlessly
    const isSuperAdmin = data.user.role === 'admin' || data.user.role === 'super_admin';
    const normalizedUser = {
      ...data.user,
      role: isSuperAdmin ? 'super_admin' : 'client',
      originalRole: data.user.role,
    };

    localStorage.setItem('auth_user', JSON.stringify(normalizedUser));
    return normalizedUser;
  },

  /**
   * Logs out the active user and clears local session
   */
  logout: () => {
    apiClient.clearAuthToken();
    localStorage.removeItem('original_admin_user');
  },

  /**
   * Gets cached user from localStorage
   */
  getCurrentUser: () => {
    if (!apiClient.getAuthToken()) {
      return null;
    }
    const userStr = localStorage.getItem('auth_user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  /**
   * Fetches latest user details and claims from GET /api/Auth/me
   */
  getMe: async () => {
    const user = await apiClient.get('/Auth/me');
    const isSuperAdmin = user.role === 'admin' || user.role === 'super_admin';
    const normalizedUser = {
      ...user,
      role: isSuperAdmin ? 'super_admin' : 'client',
      originalRole: user.role,
    };
    localStorage.setItem('auth_user', JSON.stringify(normalizedUser));
    return normalizedUser;
  },

  /**
   * Changes the authenticated user's password
   * @param {string} currentPassword
   * @param {string} newPassword
   */
  changePassword: async (currentPassword, newPassword) => {
    return apiClient.post('/Auth/change-password', {
      currentPassword,
      newPassword,
    });
  },

  /**
   * Validates onboarding setup link for first-time client
   * @param {string} token
   * @returns {Promise<{clientId: string, name: string, email: string, alreadySetup: boolean, services: string[]}>}
   */
  getSetupInfo: async (token) => {
    return apiClient.get(`/Auth/setup-info/${encodeURIComponent(token)}`);
  },

  /**
   * Completes first-time account setup, sets password, and logs client in
   * @param {{token: string, email: string, password: string}} setupData
   */
  completeSetup: async ({ token, email, password }) => {
    const data = await apiClient.post('/Auth/complete-setup', {
      token,
      email: email.trim(),
      password,
    });

    if (data && data.token) {
      apiClient.setAuthToken(data.token);
      const isSuperAdmin = data.user.role === 'admin' || data.user.role === 'super_admin';
      const normalizedUser = {
        ...data.user,
        role: isSuperAdmin ? 'super_admin' : 'client',
        originalRole: data.user.role,
      };
      localStorage.setItem('auth_user', JSON.stringify(normalizedUser));
      return normalizedUser;
    }

    return data;
  },

  /**
   * Checks whether a valid auth token is present
   */
  isAuthenticated: () => {
    return Boolean(apiClient.getAuthToken());
  },
};

export default authService;
