import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import AdminSidebar from '../components/AdminSidebar';
import { authService } from '../services/authService';
import SessionConflictModal, { getDashboardPathForUser } from '../components/SessionConflictModal';

const AdminLayout = () => {
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [conflictingUser, setConflictingUser] = useState(null);
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
      // User is logged in as a Client and tried to access /admin
      setConflictingUser(user);
    }
  }, [navigate]);

  if (conflictingUser) {
    return (
      <div className="d-flex align-items-center justify-content-center min-vh-100" style={{ background: '#f8f9fc' }}>
        <SessionConflictModal
          isOpen={true}
          currentUser={conflictingUser}
          targetAction="admin"
          onStay={() => navigate(getDashboardPathForUser(conflictingUser))}
          onProceed={() => {
            authService.logout();
            navigate('/login');
          }}
        />
      </div>
    );
  }

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
