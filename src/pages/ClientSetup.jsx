import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import syncService from '../services/syncService';
import SessionConflictModal, { getDashboardPathForUser } from '../components/SessionConflictModal';

const ClientSetup = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [conflictingUser, setConflictingUser] = useState(() => {
    return authService.isAuthenticated() ? authService.getCurrentUser() : null;
  });
  const [setupInfo, setSetupInfo] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (conflictingUser) {
      setLoading(false);
      return;
    }

    const verifyToken = async () => {
      try {
        setLoading(true);
        setError('');
        const info = await authService.getSetupInfo(token);

        if (info.alreadySetup) {
          setError('This account has already completed setup. Please go to the Login page.');
        } else {
          setSetupInfo(info);
          if (info.email) {
            setEmail(info.email);
          }
        }
      } catch (err) {
        setError(err.message || 'Invalid or expired setup link. Please contact your administrator.');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      verifyToken();
    }
  }, [token, conflictingUser]);

  const handleSetup = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      // Complete setup via backend API
      const user = await authService.completeSetup({
        token,
        email,
        password,
      });

      // Notify other tabs (like Admin Dashboard) to instantly update client status without refresh
      syncService.notify('clients');

      // Redirect to appropriate dashboard based on assigned services
      if (user.services?.includes('restaurant_menu')) {
        navigate('/restaurant_menu_dashboard');
      } else if (user.services?.includes('personal_qr')) {
        navigate('/personal_qr_dashboard');
      } else {
        navigate('/restaurant_menu_dashboard');
      }
    } catch (err) {
      setError(err.message || 'Failed to complete account setup.');
    } finally {
      setSaving(false);
    }
  };

  if (conflictingUser) {
    return (
      <div className="d-flex align-items-center justify-content-center flex-grow-1" style={{ background: '#f3f4f6', minHeight: '100vh' }}>
        <SessionConflictModal
          isOpen={true}
          message="You already have an active account open in this browser. Please log out first or open this link in a private window."
          onOk={() => {
            window.close();
            setTimeout(() => {
              if (!window.closed) {
                navigate(getDashboardPathForUser(conflictingUser));
              }
            }, 150);
          }}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center min-vh-100 bg-light">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading setup details...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="d-flex align-items-center justify-content-center flex-grow-1" style={{ background: '#f3f4f6', minHeight: '100vh' }}>
      <div className="card shadow-sm p-5 border-0 rounded-4" style={{ width: '100%', maxWidth: '450px' }}>
        <div className="text-center mb-4">
          <h2 className="fw-bold text-primary">Account Setup</h2>
          {setupInfo && (
            <p className="text-muted fs-5">
              Welcome, <span className="fw-bold text-dark">{setupInfo.name}</span>!
            </p>
          )}
          <p className="text-muted small">Please create your login credentials below to access your dashboard.</p>
        </div>

        {error ? (
          <div className="alert alert-warning text-center border-0 rounded-3">
            <p className="mb-3 fw-bold">{error}</p>
            <button onClick={() => navigate('/login')} className="btn btn-primary btn-sm">
              Go to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSetup}>
            <div className="mb-3">
              <label className="form-label fw-bold text-muted">Set Your Email</label>
              <input
                type="email"
                className="form-control"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ padding: '12px', borderRadius: '8px' }}
              />
            </div>
            <div className="mb-4">
              <label className="form-label fw-bold text-muted">Set Your Password</label>
              <input
                type="password"
                className="form-control"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={4}
                style={{ padding: '12px', borderRadius: '8px' }}
              />
              <small className="text-muted">Minimum 4 characters</small>
            </div>
            <button
              type="submit"
              className="btn btn-primary w-100 fw-bold"
              style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#7b5be4', border: 'none' }}
              disabled={saving}
            >
              {saving ? 'Setting up account...' : 'Save & Login'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ClientSetup;
