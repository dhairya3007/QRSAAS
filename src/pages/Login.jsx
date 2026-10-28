import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import SessionConflictModal, { getDashboardPathForUser } from '../components/SessionConflictModal';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [conflictingUser, setConflictingUser] = useState(() => {
    return authService.isAuthenticated() ? authService.getCurrentUser() : null;
  });
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await authService.login(email, password);
      if (user.role === 'super_admin' || user.role === 'admin') {
        navigate('/admin');
      } else {
        if (user.services?.includes('restaurant_menu')) {
          navigate('/restaurant_menu_dashboard');
        } else if (user.services?.includes('personal_qr')) {
          navigate('/personal_qr_dashboard');
        } else {
          navigate('/restaurant_menu_dashboard');
        }
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex align-items-center justify-content-center flex-grow-1" style={{ background: '#f3f4f6', minHeight: '100vh' }}>
      <SessionConflictModal
        isOpen={Boolean(conflictingUser)}
        currentUser={conflictingUser}
        targetAction="login"
        onStay={() => navigate(getDashboardPathForUser(conflictingUser))}
        onProceed={() => {
          authService.logout();
          setConflictingUser(null);
        }}
      />
      <div className="card shadow-sm p-5 border-0 rounded-4" style={{ width: '100%', maxWidth: '420px' }}>
        <div className="text-center mb-4">
          <h2 className="fw-bold text-primary">Login</h2>
          <p className="text-muted">Sign in to your SaaS dashboard</p>
        </div>
        
        {error && <div className="alert alert-danger p-2 small">{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="mb-3">
            <label className="form-label fw-bold">Email address</label>
            <input 
              type="email" 
              className="form-control" 
              placeholder="e.g. admin@test.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ padding: '12px', borderRadius: '8px' }}
            />
          </div>
          <div className="mb-4">
            <label className="form-label fw-bold">Password</label>
            <input 
              type="password" 
              className="form-control" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ padding: '12px', borderRadius: '8px' }}
            />
          </div>
          <button type="submit" className="btn btn-primary w-100 fw-bold" style={{ padding: '12px', borderRadius: '8px' }} disabled={loading}>
            {loading ? 'Signing in...' : 'Login'}
          </button>
        </form>
        
        <div className="text-center mt-4 pt-3 border-top">
          <div className="text-muted small">
            <strong>Super Admin:</strong> <code>admin@test.com</code> / <code>password123</code><br />
            <strong>Restaurant Client:</strong> <code>admin@pizzahouse.com</code> / <code>password123</code><br />
            <strong>Personal Card Client:</strong> <code>john@enterprise.com</code> / <code>password123</code>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
