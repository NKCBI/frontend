import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Building, CalendarClock, BellRing, Users, Settings, FolderKanban, LogOut, LayoutDashboard } from 'lucide-react';

const navItems = [
    { to: "/dashboard", icon: <LayoutDashboard size={20} />, label: "Dashboard" },
    // MODIFIED: The label is updated and the old "Site Profiles" link is removed.
    { to: "/devices", icon: <Building size={20} />, label: "Device & Site Mgmt" },
    { to: "/schedules", icon: <CalendarClock size={20} />, label: "Schedules" },
    { to: "/dispatch-groups", icon: <Users size={20} />, label: "Dispatch Groups" },
    { to: "/history", icon: <FolderKanban size={20} />, label: "Event History" },
];

const adminNavItems = [
    { to: "/users", icon: <Users size={20} />, label: "User Management" },
    { to: "/settings", icon: <Settings size={20} />, label: "System Settings" },
]

function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="bg-gray-900 text-gray-200 font-sans min-h-screen flex">
      <aside className="w-64 bg-gray-800 p-4 border-r border-gray-700 flex flex-col">
        <div className="px-2 mb-8">
            <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
            <p className="text-xs text-gray-400">Welcome, {user?.username}</p>
        </div>
        <nav className="space-y-2 flex-1">
            {navItems.map(item => (
                <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                        `flex items-center w-full px-4 py-3 text-left rounded-lg transition-colors duration-200 ${isActive ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`
                    }
                >
                    {item.icon}
                    <span className="ml-3">{item.label}</span>
                </NavLink>
            ))}
        </nav>
        <div className="border-t border-gray-700 pt-2">
             {adminNavItems.map(item => (
                <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                        `flex items-center w-full px-4 py-3 text-left rounded-lg transition-colors duration-200 ${isActive ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`
                    }
                >
                    {item.icon}
                    <span className="ml-3">{item.label}</span>
                </NavLink>
            ))}
            <button onClick={handleLogout} title="Logout" className="flex items-center w-full px-4 py-3 text-left text-gray-400 hover:bg-gray-700 hover:text-white rounded-lg transition-colors duration-200 mt-2">
                <LogOut size={20} />
                <span className="ml-3">Logout</span>
            </button>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}

export default AdminLayout;