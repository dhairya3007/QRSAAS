
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import BlankLayout from './layouts/BlankLayout';
import AdminLayout from './layouts/AdminLayout';

// Auth Pages
import Login from './pages/Login';
import ClientSetup from './pages/ClientSetup';

// Client Dashboard Pages
import RestaurantMenuDashboard from './pages/restaurant_menu/RestaurantMenuDashboard';
import BusinessDetails from './pages/restaurant_menu/BusinessDetails';
import CategoryManagement from './pages/restaurant_menu/CategoryManagement';
import DishManagement from './pages/restaurant_menu/DishManagement';

// Personal QR Dashboard Pages
import PersonalQRDashboard from './pages/personal_qr/PersonalQRDashboard';
import InquiriesPage from './pages/personal_qr/InquiriesPage';

// Public Dispatcher
import RouteDispatcher from './pages/public/RouteDispatcher';

// Super Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import CreateQR from './pages/admin/CreateQRrestaurent_menu';
import CreateQRPersonal from './pages/admin/CreateQRPersonal';
import Profile from './pages/Profile';

import './css/index.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />

        {/* Auth Route */}
        <Route element={<BlankLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/setup/:token" element={<ClientSetup />} />
        </Route>

        {/* Client Dashboard Routes */}
        <Route path="/restaurant_menu_dashboard" element={<DashboardLayout />}>
          <Route index element={<RestaurantMenuDashboard />} />
          <Route path="business" element={<BusinessDetails />} />
          <Route path="categories" element={<CategoryManagement />} />
          <Route path="dishes" element={<DishManagement />} />

          <Route path="profile" element={<Profile />} />
        </Route>

        {/* Personal QR Dashboard Routes */}
        <Route path="/personal_qr_dashboard" element={<DashboardLayout />}>
          <Route index element={<PersonalQRDashboard />} />
          <Route path="inquiries" element={<InquiriesPage />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* Super Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="create-qr-RestaurantMenu" element={<CreateQR />} />
          <Route path="create-qr/restaurant_menu" element={<CreateQR />} />
          <Route path="create-qr-restaurant" element={<CreateQR />} />
          <Route path="restaurant_menu" element={<CreateQR />} />
          <Route path="create-qr-personal" element={<CreateQRPersonal />} />
          <Route path="create-qr/personal_qr" element={<CreateQRPersonal />} />
          <Route path="create-qr-personal-qr" element={<CreateQRPersonal />} />
          <Route path="personal_qr" element={<CreateQRPersonal />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* Catch-all Public Route (MUST BE AT THE BOTTOM to prevent collisions) */}
        <Route element={<BlankLayout />}>
          <Route path="/:token" element={<RouteDispatcher />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
