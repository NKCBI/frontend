import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AdminLayout from './AdminLayout';

function LayoutWrapper() {
  const { user } = useAuth();

  // If the user is an Administrator, wrap all child routes in the AdminLayout.
  // The AdminLayout itself contains an <Outlet /> which will render the specific page.
  if (user && user.role === 'Administrator') {
    return <AdminLayout />;
  }

  // If the user is not an admin (i.e., a Dispatcher),
  // just render the child route directly without any layout wrapper.
  return <Outlet />;
}

export default LayoutWrapper;