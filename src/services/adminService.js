import apiClient from './apiClient';
import syncService from './syncService';

/**
 * Super Admin Management Service
 * Integrates with /api/Clients/* and /api/Analytics/admin/stats
 * Automatically broadcasts real-time sync notifications upon mutations.
 */
export const adminService = {
  /**
   * Fetches all registered clients
   * @returns {Promise<Array>} Array of ClientDto
   */
  getClients: async () => {
    return apiClient.get('/Clients');
  },

  /**
   * Fetches a single client by ID
   * @param {string} id GUID of the client
   * @returns {Promise<Object>} ClientDto
   */
  getClientById: async (id) => {
    return apiClient.get(`/Clients/${id}`);
  },

  /**
   * Creates a new client account
   * @param {{name: string, email?: string, password?: string, services: string[], serviceDurations?: Record<string, number>}} data
   * @returns {Promise<Object>} Created ClientDto
   */
  createClient: async (data) => {
    const payload = {
      name: data.name,
      email: data.email ? data.email.trim() : null,
      password: data.password ? data.password : null,
      services: data.services || [],
      serviceDurations: data.serviceDurations || {},
    };
    const res = await apiClient.post('/Clients', payload);
    syncService.notify('clients');
    return res;
  },

  /**
   * Updates an existing client's info, services, and passwords
   * @param {string} id GUID of the client
   * @param {{name?: string, email?: string, password?: string, services?: string[], serviceDurations?: Record<string, number>}} data
   * @returns {Promise<Object>} Updated ClientDto
   */
  updateClient: async (id, data) => {
    const payload = {
      name: data.name,
      email: data.email ? data.email.trim() : null,
      password: data.password ? data.password : null,
      services: data.services,
      serviceDurations: data.serviceDurations,
    };
    const res = await apiClient.put(`/Clients/${id}`, payload);
    syncService.notify('clients');
    return res;
  },

  /**
   * Permanently deletes a client
   * @param {string} id GUID of the client
   */
  deleteClient: async (id) => {
    const res = await apiClient.delete(`/Clients/${id}`);
    syncService.notify('clients');
    return res;
  },

  /**
   * Toggles client active / inactive status
   * @param {string} id GUID of the client
   * @returns {Promise<{isActive: boolean}>}
   */
  toggleStatus: async (id) => {
    const res = await apiClient.patch(`/Clients/${id}/status`);
    syncService.notify('clients');
    return res;
  },

  /**
   * Suspends or resumes a specific service for a client
   * @param {string} id GUID of the client
   * @param {string} serviceName e.g. 'restaurant_menu' or 'personal_qr'
   */
  toggleSuspension: async (id, serviceName) => {
    const res = await apiClient.patch(`/Clients/${id}/services/${encodeURIComponent(serviceName)}/suspend`);
    syncService.notify('suspension');
    return res;
  },

  /**
   * Removes a service subscription from a client
   * @param {string} id GUID of the client
   * @param {string} serviceName e.g. 'personal_qr'
   */
  removeService: async (id, serviceName) => {
    const res = await apiClient.delete(`/Clients/${id}/services/${encodeURIComponent(serviceName)}`);
    syncService.notify('services');
    return res;
  },

  /**
   * Marks a client's setup as completed for a given service
   * @param {string} id GUID of the client
   * @param {string} [service] e.g. 'restaurant_menu'
   */
  markSetupComplete: async (id, service = null) => {
    const params = service ? { service } : {};
    const res = await apiClient.patch(`/Clients/${id}/setup-complete`, {}, { params });
    syncService.notify('setup');
    return res;
  },

  /**
   * Retrieves super admin KPI statistics (Total Clients, Active Clients, Revenue)
   * @returns {Promise<{total: number, active: number, revenue: number}>}
   */
  getAdminStats: async () => {
    return apiClient.get('/Analytics/admin/stats');
  },
};

export default adminService;
