import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, QrCode, Wallet, User, ChevronDown, ChevronRight, LogOut } from 'lucide-react';
import { authService } from '../services/authService';

const AdminSidebar = ({ isHovered, setIsHovered }) => {
  const navigate = useNavigate();
  const [isQrMenuOpen, setIsQrMenuOpen] = useState(true);
  const [showWalletPopup, setShowWalletPopup] = useState(false);

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

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
          <h5 className="fw-bold text-dark m-0 text-truncate">Super Admin</h5>
        )}
      </div>
      <div className="d-flex flex-column gap-1 px-3 mt-3">
        <NavLink to="/admin" end className={({ isActive }) => `rounded px-3 py-2 text-decoration-none d-flex align-items-center ${isHovered ? 'gap-2' : 'justify-content-center'} mb-1 ${isActive ? 'bg-primary text-white fw-bold shadow-sm' : 'text-dark hover-bg-light'}`} style={{ transition: 'all 0.2s ease' }}>
          <LayoutDashboard size={18} style={{ minWidth: '18px' }} />
          {isHovered && <span style={{ whiteSpace: 'nowrap' }}>Dashboard</span>}
        </NavLink>

        {/* Accordion for QR / Website Order */}
        <div>
          <div
            onClick={() => setIsQrMenuOpen(!isQrMenuOpen)}
            className={`rounded px-3 py-2 d-flex align-items-center ${isHovered ? 'justify-content-between' : 'justify-content-center'} mb-1 text-dark hover-bg-light`}
            style={{ cursor: 'pointer', background: isQrMenuOpen ? '#eef2ff' : 'transparent', transition: 'all 0.2s ease' }}
          >
            <div className="d-flex align-items-center gap-2">
              <QrCode size={18} style={{ minWidth: '18px' }} />
              {isHovered && <span className="fw-bold text-nowrap">QR / Website Order</span>}
            </div>
            {isHovered && (isQrMenuOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
          </div>

          {isQrMenuOpen && isHovered && (
            <div className="d-flex flex-column mt-1" style={{ marginLeft: '1.5rem', borderLeft: '2px solid #e2e8f0', paddingLeft: '0.5rem' }}>
              <NavLink to="/admin/create-qr-RestaurantMenu" className={({ isActive }) => `rounded px-3 py-2 mb-1 text-decoration-none d-block fs-6 ${isActive ? 'bg-primary text-white fw-bold shadow-sm' : 'text-dark hover-bg-light'}`} style={{ transition: 'all 0.2s ease', whiteSpace: 'nowrap' }}>
                Create QR / Restaurant Menu
              </NavLink>
              <NavLink to="/admin/create-qr-personal" className={({ isActive }) => `rounded px-3 py-2 mb-1 text-decoration-none d-block fs-6 ${isActive ? 'bg-primary text-white fw-bold shadow-sm' : 'text-dark hover-bg-light'}`} style={{ transition: 'all 0.2s ease', whiteSpace: 'nowrap' }}>
                Create QR / Personal
              </NavLink>
            </div>
          )}
        </div>

        <div
          onClick={() => {
            setShowWalletPopup(true);
            setTimeout(() => setShowWalletPopup(false), 2000); // Hide after 2 seconds
          }}
          className="rounded px-3 py-2 text-decoration-none d-flex align-items-center mb-1 text-secondary hover-bg-light"
          style={{ cursor: 'pointer', transition: 'all 0.2s ease', ...(isHovered ? { gap: '0.5rem' } : { justifyContent: 'center' }) }}
        >
          <Wallet size={18} style={{ minWidth: '18px' }} />
          {isHovered && <span style={{ whiteSpace: 'nowrap' }}>Wallet</span>}
        </div>

        <NavLink to="/admin/profile" className={({ isActive }) => `rounded px-3 py-2 text-decoration-none d-flex align-items-center ${isHovered ? 'gap-2' : 'justify-content-center'} mb-1 ${isActive ? 'bg-primary text-white fw-bold shadow-sm' : 'text-dark hover-bg-light'}`} style={{ transition: 'all 0.2s ease' }}>
          <User size={18} style={{ minWidth: '18px' }} />
          {isHovered && <span style={{ whiteSpace: 'nowrap' }}>Profile</span>}
        </NavLink>
      </div>

      {showWalletPopup && (
        <div
          className="position-fixed d-flex align-items-center justify-content-center shadow-lg rounded px-4 py-3"
          style={{
            top: '20px', left: '50%', transform: 'translateX(-50%)',
            backgroundColor: '#5e35b1', color: '#fff', zIndex: 1050,
            animation: 'fadeIn 0.3s ease-in-out'
          }}
        >
          <Wallet size={20} className="me-2" />
          <span className="fw-bold fs-5">Wallet feature is coming soon!</span>
        </div>
      )}

      <div className="mt-auto px-3 mb-4">
        <button onClick={handleLogout} className={`btn w-100 text-danger d-flex align-items-center ${isHovered ? 'justify-content-between px-3' : 'justify-content-center px-0'} py-2`} style={{ background: '#fff', border: '1px solid #ffcdd2', borderRadius: '8px', transition: 'all 0.2s ease' }}>
          {isHovered && <span className="fw-bold fs-6 text-nowrap">Logout</span>}
          <LogOut size={16} style={{ minWidth: '16px' }} />
        </button>
      </div>
    </div>
  );
};

export default AdminSidebar;
