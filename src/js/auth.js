import { authService } from '../services/authService';

/**
 * Authentication Service (Re-exporting from services/authService.js for backward compatibility)
 */
export const auth = {
  login: (email, password) => authService.login(email, password),
  logout: () => authService.logout(),
  getCurrentUser: () => authService.getCurrentUser(),
  getMe: () => authService.getMe(),
  changePassword: (curr, next) => authService.changePassword(curr, next),
  getSetupInfo: (token) => authService.getSetupInfo(token),
  completeSetup: (data) => authService.completeSetup(data),
  isAuthenticated: () => authService.isAuthenticated(),
};

export default auth;
