import apiClient from './apiClient';
import syncService from './syncService';

/**
 * Public End-User Service
 * Powers QR token dispatching, public menus, public digital business cards,
 * scan counts, link click tracking, and lead inquiry submission.
 */
export const publicService = {
  /**
   * Identifies whether the scanned token is for a restaurant_menu or personal_qr
   * @param {string} token
   * @returns {Promise<string>} 'restaurant_menu' | 'personal_qr'
   */
  identifyToken: async (token) => {
    const data = await apiClient.get(`/public/qr/${token}/type`);
    return data?.type || null;
  },

  /**
   * Fetches public restaurant menu by token (client details, categories, dishes)
   * @param {string} token
   * @returns {Promise<Object>} { client, categories, dishes }
   */
  getPublicMenu: async (token) => {
    const data = await apiClient.get(`/public/menus/${token}`);
    if (!data) return { client: null, categories: [], dishes: [] };

    return {
      client: data.client ? {
        id: data.client.id || '',
        name: data.client.name || '',
        email: data.client.email || '',
        qrToken: data.client.qrToken || token,
        theme: data.client.theme || data.client.businessDetails?.theme || 'modern',
        businessDetails: data.client.businessDetails || null,
        scanCount: data.client.scanCount || 0,
      } : null,
      categories: Array.isArray(data.categories) ? data.categories.map(c => ({
        id: c.id || '',
        name: c.name || '',
        clientId: c.clientId || '',
      })) : [],
      dishes: Array.isArray(data.dishes) ? data.dishes.map(d => ({
        id: d.id || '',
        name: d.name || '',
        price: d.price ?? 0,
        quantity: d.quantity || '',
        type: d.type || 'Veg',
        description: d.description || '',
        categoryId: d.categoryId || '',
        image: d.image || '',
        isActive: d.isActive !== false,
      })) : [],
    };
  },

  /**
   * Fetches public personal digital business card by token
   * @param {string} token
   * @returns {Promise<Object>} { client, profile }
   */
  getPublicPersonalCard: async (token) => {
    const data = await apiClient.get(`/public/personal-qr/${token}`);
    if (!data) return null;

    const rawProfile = data.profile || {};
    const normalizedLinks = Array.isArray(rawProfile.links)
      ? rawProfile.links.map(l => ({
          id: l.id || '',
          category: l.category || 'Social Media',
          type: l.type || l.icon || 'Custom',
          title: l.title || l.customLabel || '',
          customLabel: l.customLabel || l.title || '',
          url: l.url || l.value || '',
          value: l.value || l.url || '',
          icon: l.icon || 'globe',
          clicks: l.clicks || 0,
          displayOrder: l.displayOrder || 0,
          isActive: l.isActive !== false,
          isEnabled: l.isActive !== false && l.isEnabled !== false,
          countryCode: l.countryCode || null,
          richText: l.richText || '',
          file: l.file || null,
          mediaItems: Array.isArray(l.mediaItems) ? l.mediaItems : [],
        }))
      : [];

    return {
      client: data.client ? {
        id: data.client.id || '',
        name: data.client.name || '',
        email: data.client.email || '',
        personalQrToken: data.client.personalQrToken || token,
        isActive: data.client.isActive !== false,
      } : null,
      profile: {
        id: rawProfile.id || '',
        clientId: rawProfile.clientId || '',
        qrToken: rawProfile.qrToken || token,
        firstName: rawProfile.firstName || '',
        lastName: rawProfile.lastName || '',
        designation: rawProfile.designation || '',
        bio: rawProfile.bio || '',
        profilePic: rawProfile.profilePic || '',
        theme: rawProfile.theme || 'minimal',
        education10th: rawProfile.education10th || '',
        education12th: rawProfile.education12th || '',
        educationCollege: rawProfile.educationCollege || '',
        educationMasters: rawProfile.educationMasters || '',
        educationPhD: rawProfile.educationPhD || '',
        links: normalizedLinks,
      },
    };
  },

  /**
   * Increments the scan count in SQL Server when a visitor opens the QR page
   * @param {string} token
   * @returns {Promise<Object>}
   */
  incrementScanCount: async (token) => {
    try {
      const res = await apiClient.post(`/public/qr/${token}/scans`);
      syncService.notify('scans');
      return res;
    } catch (err) {
      console.warn('Failed to increment scan count:', err);
    }
  },

  /**
   * Increments the click count for a CTA button link on a personal card
   * @param {string} token
   * @param {string} linkId
   * @returns {Promise<Object>}
   */
  incrementLinkClick: async (token, linkId) => {
    if (!linkId) return;
    return apiClient.post(`/public/personal-qr/${token}/links/${linkId}/click`).catch(err => {
      console.warn('Failed to increment link click:', err);
    });
  },

  /**
   * Submits a visitor inquiry/lead form from a public digital card
   * @param {string} token
   * @param {Object} inquiryData { name, email, phone, message }
   * @returns {Promise<Object>}
   */
  submitInquiry: async (token, inquiryData) => {
    const res = await apiClient.post(`/public/personal-qr/${token}/inquiries`, {
      name: inquiryData.name || '',
      email: inquiryData.email || '',
      phone: inquiryData.phone || '',
      message: inquiryData.message || '',
    });
    syncService.notify('inquiries');
    return res;
  },
};

export default publicService;
