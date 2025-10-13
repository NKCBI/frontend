import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AdminLayout from './AdminLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import DeviceManagementPage from './pages/DeviceManagementPage';
// REMOVED: SiteManagementPage is no longer needed
// import SiteManagementPage from './pages/SiteManagementPage'; 
import ScheduleManagementPage from './pages/ScheduleManagementPage';
import EventHistoryPage from './pages/EventHistoryPage';
import UserManagementPage from './pages/UserManagementPage';
import DispatchGroupsPage from './pages/DispatchGroupsPage';
import SystemSettingsPage from './pages/SystemSettingsPage';
import DispatcherDashboard from './pages/DispatcherDashboard';

// A wrapper component to protect routes that require authentication
function ProtectedRoute({ children, allowedRoles }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center bg-gray-900 text-white">Loading...</div>;
  }

  if (!user) {
    // If not logged in, redirect to the login page
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If logged in but role is not allowed, redirect to their default page
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

      {/* Role-based redirect from the root path */}
      <Route path="/" element={
        !user ? <Navigate to="/login" replace /> :
        user.role === 'Administrator' ? <Navigate to="/dashboard" replace /> :
        user.role === 'Dispatcher' ? <Navigate to="/dispatcher-dashboard" replace /> :
        <Navigate to="/login" replace /> // Fallback
      } />
      
      {/* Admin Routes */}
      <Route element={
        <ProtectedRoute allowedRoles={['Administrator']}>
          <AdminLayout />
        </ProtectedRoute>
      }>
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="devices" element={<DeviceManagementPage />} />
        {/* REMOVED: The route for the old sites page */}
        {/* <Route path="sites" element={<SiteManagementPage />} /> */}
        <Route path="schedules" element={<ScheduleManagementPage />} />
        <Route path="dispatch-groups" element={<DispatchGroupsPage />} />
        <Route path="history" element={<EventHistoryPage />} />
        <Route path="users" element={<UserManagementPage />} />
        <Route path="settings" element={<SystemSettingsPage />} />
      </Route>

      {/* Dispatcher Routes */}
      <Route path="/dispatcher-dashboard" element={
        <ProtectedRoute allowedRoles={['Dispatcher', 'Administrator']}>
          <DispatcherDashboard />
        </ProtectedRoute>
      } />

    </Routes>
  );
}

export default App;