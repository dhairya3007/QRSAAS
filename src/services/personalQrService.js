import apiClient from './apiClient';
import syncService from './syncService';

/**
 * Personal Digital Card Service
 * Integrates with /api/personal-qr-dashboard, /api/Inquiries, and /api/Analytics/scans
 * Automatically broadcasts real-time sync notifications upon mutations.
 */
export const personalQrService = {
  /**
   * Fetches personal digital card profile including CTA links and education
   * @param {string} [clientId] Optional client ID for super admin impersonation
   * @returns {Promise<Object>}
   */
  getProfile: async (clientId = null) => {
    const params = clientId ? { clientId } : {};
    const data = await apiClient.get('/personal-qr-dashboard', params);
    if (!data) return null;

    // Normalize links array so both Title/Icon (backend) and customLabel/type/value (frontend) work smoothly
    const normalizedLinks = Array.isArray(data.links)
      ? data.links.map(l => ({
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
      id: data.id || '',
      clientId: data.clientId || '',
      qrToken: data.qrToken || '',
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      designation: data.designation || '',
      bio: data.bio || '',
      profilePic: data.profilePic || '',
      theme: data.theme || 'minimal',
      education10th: data.education10th || '',
      education12th: data.education12th || '',
      educationCollege: data.educationCollege || '',
      educationMasters: data.educationMasters || '',
      educationPhD: data.educationPhD || '',
      links: normalizedLinks,
    };
  },

  /**
   * Updates personal digital card profile and links
   * @param {Object} profileData
   * @param {string} [clientId] Optional client ID
   */
  updateProfile: async (profileData, clientId = null) => {
    const params = clientId ? { clientId } : {};

    // Transform frontend links to CallToActionLinkDto for backend
    const linksDto = Array.isArray(profileData.links)
      ? profileData.links.map((l, index) => ({
          id: l.id && !l.id.includes('.') ? l.id : null,
          category: l.category || 'Social Media',
          type: l.type || 'Website',
          title: l.customLabel || l.title || l.type || 'Link',
          customLabel: l.customLabel || l.title || l.type || 'Link',
          url: l.value || l.url || '',
          value: l.value || l.url || '',
          icon: l.icon || l.type || 'globe',
          clicks: l.clicks || 0,
          displayOrder: l.displayOrder !== undefined ? l.displayOrder : index,
          isActive: l.isEnabled !== false && l.isActive !== false,
          isEnabled: l.isEnabled !== false && l.isActive !== false,
          countryCode: l.countryCode || null,
          richText: l.richText || null,
          file: l.file || null,
          mediaItems: Array.isArray(l.mediaItems) ? l.mediaItems : [],
        }))
      : undefined;

    const payload = {
      firstName: profileData.firstName !== undefined ? profileData.firstName : undefined,
      lastName: profileData.lastName !== undefined ? profileData.lastName : undefined,
      designation: profileData.designation !== undefined ? profileData.designation : undefined,
      bio: profileData.bio !== undefined ? profileData.bio : undefined,
      profilePic: profileData.profilePic !== undefined ? profileData.profilePic : undefined,
      theme: profileData.theme !== undefined ? profileData.theme : undefined,
      education10th: profileData.education10th !== undefined ? profileData.education10th : undefined,
      education12th: profileData.education12th !== undefined ? profileData.education12th : undefined,
      educationCollege: profileData.educationCollege !== undefined ? profileData.educationCollege : undefined,
      educationMasters: profileData.educationMasters !== undefined ? profileData.educationMasters : undefined,
      educationPhD: profileData.educationPhD !== undefined ? profileData.educationPhD : undefined,
      links: linksDto,
    };

    const res = await apiClient.put('/personal-qr-dashboard', payload, { params });
    syncService.notify('card');
    return res;
  },

  /**
   * Updates personal card theme
   * @param {string} theme e.g. 'minimal', 'dark', 'neon', 'corporate'
   * @param {string} [clientId] Optional client ID
   */
  updateTheme: async (theme, clientId = null) => {
    const params = clientId ? { clientId } : {};
    const res = await apiClient.patch('/personal-qr-dashboard/theme', { theme }, { params });
    syncService.notify('card_theme');
    return res;
  },

  /**
   * Fetches lead inquiries submitted via this client's public card
   * @param {string} [clientId]
   * @returns {Promise<Array>}
   */
  getInquiries: async (clientId = null) => {
    const params = clientId ? { clientId } : {};
    return apiClient.get('/Inquiries', params);
  },

  /**
   * Deletes a lead inquiry by ID
   * @param {string} id
   * @param {string} [clientId]
   */
  deleteInquiry: async (id, clientId = null) => {
    const params = clientId ? { clientId } : {};
    const res = await apiClient.delete(`/Inquiries/${id}`, params);
    syncService.notify('inquiries');
    return res;
  },

  /**
   * Gets total scan count for this card client
   * @param {string} [clientId]
   * @returns {Promise<number>}
   */
  getScanCount: async (clientId = null) => {
    const params = { service: 'personal_qr', ...(clientId ? { clientId } : {}) };
    const data = await apiClient.get('/Analytics/scans', params);
    return data?.scanCount || 0;
  },

  // --- SERVICE / CLIENT STATUS ---

  /**
   * Gets active status of the personal digital card service
   * @param {string} [clientId]
   * @returns {Promise<{isActive: boolean}>}
   */
  getStatus: async (clientId = null) => {
    const params = clientId ? { clientId } : {};
    return apiClient.get('/personal-qr-dashboard/status', params);
  },

  /**
   * Toggles active status of the personal digital card service
   * @param {string} [clientId]
   * @returns {Promise<{isActive: boolean}>}
   */
  toggleStatus: async (clientId = null) => {
    const params = clientId ? { clientId } : {};
    const res = await apiClient.patch('/personal-qr-dashboard/status', {}, { params });
    syncService.notify('card_status');
    return res;
  },
};

export default personalQrService;
