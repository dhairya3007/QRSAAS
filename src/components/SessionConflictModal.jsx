import React from 'react';
import { AlertTriangle, LogOut, ArrowRight, ShieldCheck } from 'lucide-react';

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
 * SessionConflictModal
 * 
 * Pops up when a user with an active session attempts to:
 * - Open a setup link (/setup/:token)
 * - Visit the login page (/login)
 * - Intermix conflicting sessions in the same browser
 */
const SessionConflictModal = ({
  isOpen,
  currentUser,
  targetAction = 'setup', // 'setup' | 'login' | 'general'
  onStay,
  onProceed,
}) => {
  if (!isOpen || !currentUser) return null;

  const isAdmin = currentUser.role === 'super_admin' || currentUser.role === 'admin';
  const roleDisplay = isAdmin ? 'Super Admin' : 'Client Account';
  const displayName = currentUser.name || currentUser.email || 'Active User';

  let explanation = '';
  if (targetAction === 'setup') {
    explanation = isAdmin
      ? 'You are currently signed in as an Admin. Opening a client setup link while logged in as Admin will overwrite your session or cause permission conflicts.'
      : 'You are currently signed in to another Client account. To set up this new account, you must log out of your current session first.';
  } else if (targetAction === 'login') {
    explanation =
      'You already have an active session in this browser. Multiple simultaneous logins in the same browser are not permitted to prevent account data collisions.';
  } else {
    explanation =
      'An active session is already detected in this browser. Please log out first before switching roles or opening external setup links.';
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(5px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      <div
        className="card border-0 shadow-lg"
        style={{
          width: '100%',
          maxWidth: '480px',
          borderRadius: '16px',
          overflow: 'hidden',
          backgroundColor: '#ffffff',
        }}
      >
        {/* Header Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
            padding: '24px',
            borderBottom: '1px solid #fecaca',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: '#ef4444',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 4px 10px rgba(239, 68, 68, 0.3)',
            }}
          >
            <AlertTriangle size={26} />
          </div>
          <div>
            <h5 className="fw-bold mb-1" style={{ color: '#991b1b' }}>
              Active Session Detected
            </h5>
            <p className="text-muted small mb-0">Single-session browser safety guard</p>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4">
          <p className="text-secondary mb-3" style={{ fontSize: '0.95rem', lineHeight: '1.5' }}>
            {explanation}
          </p>

          {/* Current Active User Info Box */}
          <div
            className="p-3 mb-4 rounded-3 border"
            style={{
              backgroundColor: '#f8fafc',
              borderColor: '#e2e8f0',
            }}
          >
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span className="text-muted small text-uppercase fw-bold" style={{ letterSpacing: '0.5px' }}>
                Currently Signed In
              </span>
              <span
                className={`badge ${isAdmin ? 'bg-primary' : 'bg-success'} text-white fw-semibold`}
                style={{ fontSize: '0.75rem', padding: '5px 10px', borderRadius: '6px' }}
              >
                {roleDisplay}
              </span>
            </div>
            <div className="fw-bold text-dark" style={{ fontSize: '1rem' }}>
              {displayName}
            </div>
            {currentUser.email && currentUser.email !== displayName && (
              <div className="text-muted small">{currentUser.email}</div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="d-grid gap-2">
            <button
              type="button"
              onClick={onStay}
              className="btn btn-primary d-flex align-items-center justify-content-center gap-2 fw-semibold"
              style={{
                padding: '12px 18px',
                borderRadius: '10px',
                backgroundColor: '#4f46e5',
                borderColor: '#4f46e5',
              }}
            >
              <ShieldCheck size={18} />
              Stay in Current Session (Go to Dashboard)
            </button>

            <button
              type="button"
              onClick={onProceed}
              className="btn btn-outline-danger d-flex align-items-center justify-content-center gap-2 fw-semibold"
              style={{
                padding: '12px 18px',
                borderRadius: '10px',
              }}
            >
              <LogOut size={18} />
              Log Out &amp; Proceed Here
            </button>
          </div>

          {/* Incognito Tip */}
          <div
            className="mt-4 p-2.5 rounded-3 text-muted small text-center"
            style={{
              backgroundColor: '#f1f5f9',
              fontSize: '0.8rem',
            }}
          >
            💡 <strong>Need both active?</strong> Open this link in an{' '}
            <span className="text-dark fw-semibold">Incognito / Private Window</span> or separate browser.
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionConflictModal;

