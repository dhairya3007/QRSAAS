import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { authService } from '../services/authService';
import { Maximize, Minimize } from 'lucide-react';

const DashboardLayout = () => {
  const navigate = useNavigate();
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate('/login');
    }
  }, [navigate]);

  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
  }, []);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  return (
    <div className="d-flex" style={{ minHeight: '100vh', background: '#f8f9fc' }}>
      <Sidebar isHovered={isSidebarHovered} setIsHovered={setIsSidebarHovered} />
      <div 
        className="flex-grow-1 d-flex flex-column" 
        style={{ 
          marginLeft: isSidebarHovered ? '260px' : '80px', 
          transition: 'margin-left 0.3s ease' 
        }}
      >
        {/* Top Navbar */}
        <div className="w-100 d-flex justify-content-end align-items-center p-3" style={{ background: '#fff', borderBottom: '1px solid #e0e0e0', zIndex: 10, position: 'sticky', top: 0 }}>
          {localStorage.getItem('original_admin_user') && (
            <button 
              onClick={() => {
                localStorage.setItem('auth_user', localStorage.getItem('original_admin_user'));
                localStorage.removeItem('original_admin_user');
                window.location.href = '/admin';
              }}
              className="btn btn-danger btn-sm fw-bold me-auto shadow-sm"
            >
              Exit Impersonation & Return to Admin
            </button>
          )}
          <button 
            onClick={toggleFullScreen} 
            className="btn btn-light shadow-sm d-flex align-items-center justify-content-center p-2 rounded-circle border"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize size={20} className="text-secondary" /> : <Maximize size={20} className="text-secondary" />}
          </button>
        </div>
        
        {/* Main Content Area */}
        <div className="p-4 flex-grow-1">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
