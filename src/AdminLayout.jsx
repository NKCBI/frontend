import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { 
    Building, CalendarClock, Users, Settings, FolderKanban, 
    LogOut, LayoutDashboard, RadioTower, ChevronsLeft, ChevronsRight, KeyRound // Import KeyRound icon
} from 'lucide-react';

const navItems = [
    { to: "/dashboard", icon: <LayoutDashboard size={20} />, label: "Dashboard" },
    // --- NEW: Alerts Only Dispatch (Default for Dispatchers) ---
    { to: "/alerts", icon: <RadioTower size={20} />, label: "Alerts Only Dispatch" },
    // --- MODIFIED: Renamed the existing live video page ---
    { to: "/dispatcher-dashboard", icon: <RadioTower size={20} />, label: "Live Video Dashboard" },
    { to: "/devices", icon: <Building size={20} />, label: "Device & Site Mgmt" },
    { to: "/schedules", icon: <CalendarClock size={20} />, label: "Schedules" },
    { to: "/dispatch-groups", icon: <Users size={20} />, label: "Dispatch Groups" },
    { to: "/history", icon: <FolderKanban size={20} />, label: "Event History" },
];

const adminNavItems = [
    { to: "/users", icon: <Users size={20} />, label: "User Management" },
    { to: "/settings", icon: <Settings size={20} />, label: "System Settings" },
    // --- NEW NAVIGATION ITEM ---
    { to: "/change-password", icon: <KeyRound size={20} />, label: "Change Password" },
];

function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="bg-brand-900 text-brand-300 font-sans min-h-screen flex">
      
      <aside 
        className={`w-64 bg-brand-800 p-4 border-r border-brand-700 flex flex-col fixed top-0 left-0 h-full z-40 transition-transform duration-300 ease-in-out ${isSidebarVisible ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="p-4">
            <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
            <p className="text-xs text-brand-400">Welcome, {user?.username}</p>
        </div>
        
        <nav className="flex-1 space-y-2 overflow-y-auto px-4">
            {navItems.map(item => (
                <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                        `flex items-center w-full px-4 py-3 text-left rounded-lg transition-colors duration-200 ${isActive ? 'bg-accent text-brand-900 font-semibold' : 'text-brand-400 hover:bg-brand-700 hover:text-white'}`
                    }
                >
                    {item.icon}
                    <span className="ml-3">{item.label}</span>
                </NavLink>
            ))}
        </nav>
        
        <div className="p-4 border-t border-brand-700">
             {adminNavItems.map(item => (
                <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                        `flex items-center w-full px-4 py-3 text-left rounded-lg transition-colors duration-200 ${isActive ? 'bg-accent text-brand-900 font-semibold' : 'text-brand-400 hover:bg-brand-700 hover:text-white'}`
                    }
                >
                    {item.icon}
                    <span className="ml-3">{item.label}</span>
                </NavLink>
            ))}
            <button onClick={handleLogout} title="Logout" className="flex items-center w-full px-4 py-3 text-left text-brand-400 hover:bg-brand-700 hover:text-white rounded-lg transition-colors duration-200 mt-2">
                <LogOut size={20} />
                <span className="ml-3">Logout</span>
            </button>
        </div>
      </aside>

      <button
        onClick={() => setIsSidebarVisible(!isSidebarVisible)}
        className="fixed top-1/2 -translate-y-1/2 z-50 p-2 bg-brand-800 rounded-r-lg text-brand-300 hover:bg-brand-700 hover:text-white transition-all duration-300 ease-in-out"
        style={{ left: isSidebarVisible ? '16rem' : '0' }}
        title={isSidebarVisible ? "Collapse Sidebar" : "Expand Sidebar"}
      >
        {isSidebarVisible ? <ChevronsLeft size={20} /> : <ChevronsRight size={20} />}
      </button>

      <main className={`flex-1 p-8 overflow-y-auto transition-all duration-300 ease-in-out ${isSidebarVisible ? 'ml-64' : 'ml-0'}`}>
        <Outlet />
      </main>

    </div>
  );
}

export default AdminLayout;