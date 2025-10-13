import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../api';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext(null);
const SESSION_KEY = 'vms_dispatch_session';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  // --- STATE LIFTED UP ---
  // The alerts state is now managed globally in the AuthContext.
  const [alerts, setAlerts] = useState([]);

  const navigate = useNavigate();
  const location = useLocation();

  // This effect runs when the user navigates away from the dispatch dashboard
  // It saves the session state.
  useEffect(() => {
    return () => {
      if (location.pathname !== '/dispatcher-dashboard' && user && alerts.length > 0) {
        const sessionToSave = {
            username: user.username,
            alerts: alerts,
            timestamp: Date.now(),
        };
        localStorage.setItem(SESSION_KEY, JSON.stringify(sessionToSave));
      }
    };
  }, [location, user, alerts]);


  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
        try {
            const decodedUser = jwtDecode(token);
            if (decodedUser.exp * 1000 < Date.now()) {
                localStorage.removeItem('authToken');
                setUser(null);
            } else {
                setUser({ 
                    username: decodedUser.username, 
                    role: decodedUser.role, 
                    dispatchGroupId: decodedUser.dispatchGroupId 
                });
            }
        } catch (error) {
            console.error("Invalid token on initial load:", error);
            localStorage.removeItem('authToken');
            setUser(null);
        }
    }
    setIsLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      const response = await api.login(username, password);
      const { token, user: userData } = response.data;
      
      localStorage.setItem('authToken', token);
      setUser(userData);
      
      // On new login, check if the user is different from the one in the saved session.
      // If so, clear the session to ensure a fresh start.
      const savedSessionJSON = localStorage.getItem(SESSION_KEY);
      if (savedSessionJSON) {
          const savedSession = JSON.parse(savedSessionJSON);
          if (savedSession.username !== userData.username) {
              localStorage.removeItem(SESSION_KEY);
          }
      }

      if (userData.role === 'Administrator') {
        navigate('/dashboard');
      } else if (userData.role === 'Dispatcher') {
        navigate('/dispatcher-dashboard');
      } else {
        navigate('/');
      }

    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = () => {
    // Before logging out, save the current state to localStorage
    if (user && alerts.length > 0) {
        const sessionToSave = {
            username: user.username,
            alerts: alerts,
            timestamp: Date.now(),
        };
        localStorage.setItem(SESSION_KEY, JSON.stringify(sessionToSave));
    }
    
    localStorage.removeItem('authToken');
    setUser(null);
    setAlerts([]); // Clear alerts from memory
    navigate('/login');
  };

  const value = {
    user,
    isLoading,
    login,
    logout,
    // Provide alerts and a way to update them to the rest of the app
    alerts,
    setAlerts,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};