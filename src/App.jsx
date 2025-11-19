import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LayoutWrapper from './LayoutWrapper';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import DeviceManagementPage from './pages/DeviceManagementPage';
import ScheduleManagementPage from './pages/ScheduleManagementPage';
import EventHistoryPage from './pages/EventHistoryPage';
import UserManagementPage from './pages/UserManagementPage';
import DispatchGroupsPage from './pages/DispatchGroupsPage';
import SystemSettingsPage from './pages/SystemSettingsPage';
import DispatcherDashboard from './pages/DispatcherDashboard';
import AlertsOnlyPage from './pages/AlertsOnlyPage'; // --- NEW: Import the new page ---
import ChangePasswordPage from './pages/ChangePasswordPage';

function ProtectedRoute({ children }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center bg-gray-900 text-white">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        element={
          <ProtectedRoute>
            <LayoutWrapper />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={
          !user ? <Navigate to="/login" replace /> :
          user.role === 'Administrator' ? <Navigate to="/dashboard" replace /> :
          user.role === 'Dispatcher' ? <Navigate to="/alerts" replace /> : // --- MODIFIED: Dispatcher default route is now /alerts ---
          <Navigate to="/login" replace />
        } />

        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="devices" element={<DeviceManagementPage />} />
        <Route path="schedules" element={<ScheduleManagementPage />} />
        <Route path="dispatch-groups" element={<DispatchGroupsPage />} />
        <Route path="history" element={<EventHistoryPage />} />
        <Route path="users" element={<UserManagementPage />} />
        <Route path="settings" element={<SystemSettingsPage />} />
        <Route path="dispatcher-dashboard" element={<DispatcherDashboard />} />
        
        {/* --- NEW: Add the route for the alerts-only dispatch page --- */}
        <Route path="alerts" element={<AlertsOnlyPage />} />
        
        {/* --- EXISTING: Change password route --- */}
        <Route path="change-password" element={<ChangePasswordPage />} />
      </Route>
    </Routes>
  );
}

export default App;