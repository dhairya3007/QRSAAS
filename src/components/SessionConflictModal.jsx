import React from 'react';

/**
 * Helper to determine dashboard path for a user
 */
export const getDashboardPathForUser = (user) => {
  if (!user) return '/login';
  const role = user.role?.toLowerCase() || '';
  if (role === 'super_admin' || role === 'admin') {
    return '/admin';
  }
  if (user.services && Array.isArray(user.services)) {
    if (user.services.includes('personal_qr') && !user.services.includes('restaurant_menu')) {
      return '/personal_qr_dashboard';
    }
  }
  return '/restaurant_menu_dashboard';
};

/**
 * Simple, compact error popup with a single OK button
 */
const SessionConflictModal = ({ isOpen, message, onOk }) => {
  if (!isOpen) return null;

  return (
    <div
      className="modal show d-block"
      tabIndex="-1"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.45)', zIndex: 9999 }}
    >
      <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '360px' }}>
        <div className="modal-content border-0 shadow rounded-3 p-3 text-center">
          <div className="modal-body p-2">
            <h6 className="fw-bold text-danger mb-2">
              ⚠️ Session Already Active
            </h6>
            <p className="text-muted small mb-3">
              {message || 'You already have an active account open in this browser. Please log out first or open in a private window.'}
            </p>
            <div className="d-flex justify-content-center">
              <button
                type="button"
                className="btn btn-primary btn-sm px-4 fw-bold"
                style={{ minWidth: '100px' }}
                onClick={onOk}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionConflictModal;
