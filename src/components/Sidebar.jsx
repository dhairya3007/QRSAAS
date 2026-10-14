import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogOut, ChevronDown, ChevronRight, User, QrCode } from 'lucide-react';
import { authService } from '../services/authService';
import syncService from '../services/syncService';

const Sidebar = ({ isHovered, setIsHovered }) => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(authService.getCurrentUser());
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const [isPersonalOpen, setIsPersonalOpen] = useState(true);

  const syncUser = () => {
    const updated = authService.getCurrentUser();
    if (updated) {
      setCurrentUser(updated);
    }
  };

  useEffect(() => {
    syncUser();

    const unsubscribe = syncService.subscribe(() => {
      syncUser();
    });

    window.addEventListener('auth_user_updated', syncUser);
    window.addEventListener('storage', syncUser);
    window.addEventListener('focus', syncUser);

    return () => {
      unsubscribe();
      window.removeEventListener('auth_user_updated', syncUser);
      window.removeEventListener('storage', syncUser);
      window.removeEventListener('focus', syncUser);
    };
  }, []);

  const user = currentUser;

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  // Backwards compatibility: If a client has no services array, assume they are a restaurant client
  const hasRestaurant = user?.services?.includes('restaurant_menu') || !user?.services || user.services.length === 0;
  const hasPersonal = user?.services?.includes('personal_qr');

  return (
    <div 
      className="sidebar d-flex flex-column" 
      style={{ 
        width: isHovered ? '260px' : '80px', 
        position: 'fixed', left: 0, top: 0, bottom: 0, 
        background: '#f8f9fc', borderRight: '1px solid #e0e0e0', zIndex: 1000,
        transition: 'width 0.3s ease',
        overflowX: 'hidden'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="px-3 border-bottom d-flex align-items-center justify-content-center" style={{ height: '70px', background: '#f8f9fc' }}>
        {isHovered && (
          <h5 className="fw-bold text-dark m-0 text-truncate">{user?.name || 'Client Dashboard'}</h5>
        )}
      </div>

      <div className="d-flex flex-column px-3 mt-3" style={{ overflowY: 'auto' }}>
        
        {/* Restaurant Menu Section */}
        {hasRestaurant && (
          <div className="mb-3">
            <div
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`rounded px-3 py-2 d-flex align-items-center ${isHovered ? 'justify-content-between' : 'justify-content-center'} mb-1 text-dark hover-bg-light`}
              style={{ cursor: 'pointer', background: isMenuOpen ? '#eef2ff' : 'transparent', transition: 'all 0.2s ease' }}
            >
              <div className="d-flex align-items-center gap-2">
                <LayoutDashboard size={18} style={{ minWidth: '18px' }} />
                {isHovered && <span className="fw-bold text-nowrap">Restaurant Menu</span>}
              </div>
              {isHovered && (isMenuOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
            </div>

            {isMenuOpen && isHovered && (
              <div className="d-flex flex-column mt-1" style={{ marginLeft: '1.5rem', borderLeft: '2px solid #e2e8f0', paddingLeft: '0.5rem' }}>
                <NavLink
                  to="/restaurant_menu_dashboard"
                  end
                  className={({ isActive }) => `rounded px-3 py-2 mb-1 text-decoration-none d-block fs-6 ${isActive ? 'bg-primary text-white fw-bold shadow-sm' : 'text-dark hover-bg-light'}`}
                  style={{ transition: 'all 0.2s ease', whiteSpace: 'nowrap' }}
                >
                  Dashboard
                </NavLink>
              </div>
            )}
          </div>
        )}

        {/* Personal QR Section */}
        {hasPersonal && (
          <div className="mb-3">
            <div
              onClick={() => setIsPersonalOpen(!isPersonalOpen)}
              className={`rounded px-3 py-2 d-flex align-items-center ${isHovered ? 'justify-content-between' : 'justify-content-center'} mb-1 text-dark hover-bg-light`}
              style={{ cursor: 'pointer', background: isPersonalOpen ? '#eef2ff' : 'transparent', transition: 'all 0.2s ease' }}
            >
              <div className="d-flex align-items-center gap-2">
                <QrCode size={18} style={{ minWidth: '18px' }} />
                {isHovered && <span className="fw-bold text-nowrap">Personal QR Card</span>}
              </div>
              {isHovered && (isPersonalOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
            </div>

            {isPersonalOpen && isHovered && (
              <div className="d-flex flex-column mt-1" style={{ marginLeft: '1.5rem', borderLeft: '2px solid #e2e8f0', paddingLeft: '0.5rem' }}>
                <NavLink
                  to="/personal_qr_dashboard"
                  end
                  className={({ isActive }) => `rounded px-3 py-2 mb-1 text-decoration-none d-block fs-6 ${isActive ? 'bg-primary text-white fw-bold shadow-sm' : 'text-dark hover-bg-light'}`}
                  style={{ transition: 'all 0.2s ease', whiteSpace: 'nowrap' }}
                >
                  Dashboard
                </NavLink>

                <NavLink
                  to="/personal_qr_dashboard/inquiries"
                  className={({ isActive }) => `rounded px-3 py-2 mb-1 text-decoration-none d-block fs-6 ${isActive ? 'bg-primary text-white fw-bold shadow-sm' : 'text-dark hover-bg-light'}`}
                  style={{ transition: 'all 0.2s ease', whiteSpace: 'nowrap' }}
                >
                  Inquiries
                </NavLink>
              </div>
            )}
          </div>
        )}

        {/* Global Settings */}
        <div className="mt-2 pt-3 border-top">
          <NavLink 
            to={hasRestaurant ? "/restaurant_menu_dashboard/profile" : "/personal_qr_dashboard/profile"} 
            className={({ isActive }) => `rounded px-3 py-2 text-decoration-none d-flex align-items-center ${isHovered ? 'gap-2' : 'justify-content-center'} mb-1 ${isActive ? 'bg-primary text-white fw-bold shadow-sm' : 'text-dark hover-bg-light'}`} 
            style={{ transition: 'all 0.2s ease' }}
          >
            <User size={18} style={{ minWidth: '18px' }} /> 
            {isHovered && <span style={{ whiteSpace: 'nowrap' }}>Account Settings</span>}
          </NavLink>
        </div>

      </div>

      <div className="mt-auto px-3 mb-4">
        <button onClick={handleLogout} className={`btn w-100 text-danger d-flex align-items-center ${isHovered ? 'justify-content-between px-3' : 'justify-content-center px-0'} py-2`} style={{ background: '#fff', border: '1px solid #ffcdd2', borderRadius: '8px', transition: 'all 0.2s ease' }}>
          {isHovered && <span className="fw-bold fs-6 text-nowrap">Logout</span>}
          <LogOut size={16} style={{ minWidth: '16px' }} />
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
