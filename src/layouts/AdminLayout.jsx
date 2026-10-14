import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import AdminSidebar from '../components/AdminSidebar';
import { authService } from '../services/authService';

const AdminLayout = () => {
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let user = authService.getCurrentUser();
    const isAdmin = user && (user.role === 'super_admin' || user.role === 'admin');

    // Auto-restore admin session if they were impersonating a client and clicked back to /admin
    if (user && !isAdmin) {
      const originalAdmin = localStorage.getItem('original_admin_user');
      if (originalAdmin) {
        localStorage.setItem('auth_user', originalAdmin);
        localStorage.removeItem('original_admin_user');
        window.location.reload();
        return;
      }
    }

    if (!user || !authService.isAuthenticated()) {
      navigate('/login');
    } else if (!isAdmin) {
      // Redirect clients away from admin area
      if (user.services && user.services.includes('personal_qr') && !user.services.includes('restaurant_menu')) {
        navigate('/personal_qr_dashboard');
      } else {
        navigate('/restaurant_menu_dashboard');
      }
    }
  }, [navigate]);

  return (
    <div className="d-flex" style={{ minHeight: '100vh', background: '#f8f9fc' }}>
      <AdminSidebar isHovered={isSidebarHovered} setIsHovered={setIsSidebarHovered} />
      <div 
        className="flex-grow-1 p-4" 
        style={{ 
          marginLeft: isSidebarHovered ? '260px' : '80px', 
          transition: 'margin-left 0.3s ease' 
        }}
      >
        <Outlet />
      </div>
    </div>
  );
};

export default AdminLayout;
