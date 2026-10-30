import apiClient from './apiClient';
import syncService from './syncService';

/**
 * Restaurant Menu Management Service
 * Integrates with /api/restaurant-menu/*, /api/Categories/*, /api/Dishes/*, /api/dish-types/*, and /api/Analytics/scans
 * Automatically broadcasts real-time sync notifications upon mutations.
 */
export const restaurantService = {
  // --- BUSINESS DETAILS & THEME ---
  
  /**
   * Fetches business details for the current or specified client
   * @param {string} [clientId]
   * @returns {Promise<{name: string, phone: string, address: string, logo: string, theme: string}>}
   */
  getBusinessDetails: async (clientId = null) => {
    const params = clientId ? { clientId } : {};
    return apiClient.get('/restaurant-menu/business', params);
  },

  /**
   * Saves/updates business details
   * @param {{name: string, phone: string, address: string, logo?: string}} details
   * @param {string} [clientId]
   */
  saveBusinessDetails: async (details, clientId = null) => {
    const params = clientId ? { clientId } : {};
    const payload = {
      name: details.name || '',
      phone: details.phone || '',
      address: details.address || '',
      logo: details.logo || null,
    };
    const res = await apiClient.put('/restaurant-menu/business', payload, { params });
    syncService.notify('business');
    return res;
  },

  /**
   * Updates restaurant menu active theme
   * @param {string} theme e.g. 'modern', 'dark', 'classic'
   * @param {string} [clientId]
   */
  updateTheme: async (theme, clientId = null) => {
    const params = clientId ? { clientId } : {};
    const res = await apiClient.patch('/restaurant-menu/theme', { theme }, { params });
    syncService.notify('theme');
    return res;
  },

  // --- CATEGORIES ---

  /**
   * Fetches categories
   * @param {string} [clientId]
   * @returns {Promise<Array<{id: string, name: string, clientId: string}>>}
   */
  getCategories: async (clientId = null) => {
    const params = clientId ? { clientId } : {};
    return apiClient.get('/Categories', params);
  },

  /**
   * Creates a new category
   * @param {string} name
   * @param {string} [clientId]
   */
  addCategory: async (name, clientId = null) => {
    const payload = {
      name: name.trim(),
      clientId: clientId || null,
    };
    const res = await apiClient.post('/Categories', payload);
    syncService.notify('categories');
    return res;
  },

  /**
   * Deletes a category by ID
   * @param {string} id
   * @param {string} [clientId]
   */
  deleteCategory: async (id, clientId = null) => {
    const params = clientId ? { clientId } : {};
    const res = await apiClient.delete(`/Categories/${id}`, params);
    syncService.notify('categories');
    return res;
  },

  /**
   * Toggles category active/deactive status
   * @param {string} id
   * @param {string} [clientId]
   */
  toggleCategoryStatus: async (id, clientId = null) => {
    const params = clientId ? { clientId } : {};
    const res = await apiClient.patch(`/Categories/${id}/toggle-status`, {}, { params });
    syncService.notify('categories');
    syncService.notify('dishes');
    return res;
  },

  // --- DISH TYPES ---

  /**
   * Fetches dish types (e.g. Veg, Non-Veg, Vegan)
   * @param {string} [clientId]
   */
  getDishTypes: async (clientId = null) => {
    const params = clientId ? { clientId } : {};
    return apiClient.get('/dish-types', params);
  },

  /**
   * Adds a new dish type
   * @param {string} name
   * @param {string} [clientId]
   */
  addDishType: async (name, clientId = null) => {
    const res = await apiClient.post('/dish-types', { name: name.trim(), clientId: clientId || null });
    syncService.notify('dishTypes');
    return res;
  },

  /**
   * Deletes a dish type
   * @param {string} id
   * @param {string} [clientId]
   */
  deleteDishType: async (id, clientId = null) => {
    const params = clientId ? { clientId } : {};
    const res = await apiClient.delete(`/dish-types/${id}`, params);
    syncService.notify('dishTypes');
    return res;
  },

  /**
   * Toggles dish type active/deactive status
   * @param {string} id
   * @param {string} [clientId]
   */
  toggleDishTypeStatus: async (id, clientId = null) => {
    const params = clientId ? { clientId } : {};
    const res = await apiClient.patch(`/dish-types/${id}/toggle-status`, {}, { params });
    syncService.notify('dishTypes');
    syncService.notify('dishes');
    return res;
  },

  // --- DISHES ---

  /**
   * Fetches all dishes
   * @param {string} [clientId]
   * @returns {Promise<Array>}
   */
  getDishes: async (clientId = null) => {
    const params = clientId ? { clientId } : {};
    return apiClient.get('/Dishes', params);
  },

  /**
   * Creates a new dish
   * @param {{name: string, price: number|string, quantity?: string, type?: string, description?: string, categoryId: string, image?: string, isActive?: boolean}} dish
   * @param {string} [clientId]
   */
  addDish: async (dish, clientId = null) => {
    const payload = {
      name: dish.name.trim(),
      price: parseFloat(dish.price) || 0,
      quantity: dish.quantity || '',
      type: dish.type || 'Veg',
      description: dish.description || '',
      categoryId: dish.categoryId,
      image: dish.image || null,
      isActive: dish.isActive !== false,
      clientId: clientId || null,
    };
    const res = await apiClient.post('/Dishes', payload);
    syncService.notify('dishes');
    return res;
  },

  /**
   * Updates an existing dish
   * @param {string} id
   * @param {Object} dish
   * @param {string} [clientId]
   */
  updateDish: async (id, dish, clientId = null) => {
    const params = clientId ? { clientId } : {};
    const payload = {
      name: dish.name,
      price: dish.price !== undefined ? parseFloat(dish.price) : undefined,
      quantity: dish.quantity,
      type: dish.type,
      description: dish.description,
      categoryId: dish.categoryId,
      image: dish.image,
      isActive: dish.isActive,
    };
    const res = await apiClient.put(`/Dishes/${id}`, payload, { params });
    syncService.notify('dishes');
    return res;
  },

  /**
   * Deletes a dish by ID
   * @param {string} id
   * @param {string} [clientId]
   */
  deleteDish: async (id, clientId = null) => {
    const params = clientId ? { clientId } : {};
    const res = await apiClient.delete(`/Dishes/${id}`, params);
    syncService.notify('dishes');
    return res;
  },

  /**
   * Toggles dish status (Available vs Out of Stock)
   * @param {string} id
   * @param {string} [clientId]
   * @returns {Promise<{isActive: boolean}>}
   */
  toggleDishStatus: async (id, clientId = null) => {
    const params = clientId ? { clientId } : {};
    const res = await apiClient.patch(`/Dishes/${id}/status`, {}, { params });
    syncService.notify('dishes');
    return res;
  },

  // --- ANALYTICS ---

  /**
   * Gets total scan count for this restaurant client
   * @param {string} [clientId]
   * @returns {Promise<number>}
   */
  getScanCount: async (clientId = null) => {
    const params = { service: 'restaurant_menu', ...(clientId ? { clientId } : {}) };
    const data = await apiClient.get('/Analytics/scans', params);
    return data?.scanCount || 0;
  },

  // --- SERVICE / CLIENT STATUS ---

  /**
   * Gets active status of the restaurant menu service
   * @param {string} [clientId]
   * @returns {Promise<{isActive: boolean}>}
   */
  getStatus: async (clientId = null) => {
    const params = clientId ? { clientId } : {};
    return apiClient.get('/restaurant-menu/status', params);
  },

  /**
   * Toggles active status of the restaurant menu service
   * @param {string} [clientId]
   * @returns {Promise<{isActive: boolean}>}
   */
  toggleStatus: async (clientId = null) => {
    const params = clientId ? { clientId } : {};
    const res = await apiClient.patch('/restaurant-menu/status', {}, { params });
    syncService.notify('status');
    return res;
  },
};

export default restaurantService;
