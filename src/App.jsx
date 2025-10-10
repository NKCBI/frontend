import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AdminLayout from './AdminLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import DeviceManagementPage from './pages/DeviceManagementPage';
import SiteManagementPage from './pages/SiteManagementPage';
import ScheduleManagementPage from './pages/ScheduleManagementPage';
import EventHistoryPage from './pages/EventHistoryPage';
import UserManagementPage from './pages/UserManagementPage';
import DispatchGroupsPage from './pages/DispatchGroupsPage';
import SystemSettingsPage from './pages/SystemSettingsPage';
import DispatcherDashboard from './pages/DispatcherDashboard';
import ForcePasswordChangePage from './pages/ForcePasswordChangePage';

// A wrapper component to protect routes that require authentication
function ProtectedRoute({ children }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center bg-gray-900 text-white">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (user.passwordChangeRequired && location.pathname !== '/force-password-change') {
    return <Navigate to="/force-password-change" replace />;
  }

  return children;
}

// Component to protect routes by role
function RoleProtectedRoute({ allowedRoles, children }) {
    const { user } = useAuth();

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        const defaultPath = user.role === 'Dispatcher' ? '/dispatcher-dashboard' : '/dashboard';
        return <Navigate to={defaultPath} replace />;
    }

    return children;
}


function App() {
  console.log("VITE_API_URL from App.jsx:", import.meta.env.VITE_API_URL);
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center bg-gray-900 text-white">Authenticating...</div>;
  }
  
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route path="/force-password-change" element={
        <ProtectedRoute>
          <ForcePasswordChangePage />
        </ProtectedRoute>
      } />

      {/* Role-based redirect from the root path */}
      <Route path="/" element={
        !user ? <Navigate to="/login" replace /> :
        user.passwordChangeRequired ? <Navigate to="/force-password-change" replace /> :
        user.role === 'Administrator' ? <Navigate to="/dashboard" replace /> :
        user.role === 'Dispatcher' ? <Navigate to="/dispatcher-dashboard" /> :
        <Navigate to="/login" replace /> // Fallback
      } />
      
      {/* Admin Routes */}
      <Route element={
        <ProtectedRoute>
          <RoleProtectedRoute allowedRoles={['Administrator']}>
            <AdminLayout />
          </RoleProtectedRoute>
        </ProtectedRoute>
      }>
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="devices" element={<DeviceManagementPage />} />
        <Route path="sites" element={<SiteManagementPage />} />
        <Route path="schedules" element={<ScheduleManagementPage />} />
        <Route path="dispatch-groups" element={<DispatchGroupsPage />} />
        <Route path="history" element={<EventHistoryPage />} />
        <Route path="users" element={<UserManagementPage />} />
        <Route path="settings" element={<SystemSettingsPage />} />
      </Route>

      {/* Dispatcher Routes */}
      <Route path="/dispatcher-dashboard" element={
        <ProtectedRoute>
          <RoleProtectedRoute allowedRoles={['Dispatcher']}>
            <DispatcherDashboard />
          </RoleProtectedRoute>
        </ProtectedRoute>
      } />

    </Routes>
  );
}

export default App;