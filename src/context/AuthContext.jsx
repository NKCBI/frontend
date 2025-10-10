import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
        try {
            const decodedUser = jwtDecode(token);
            // Check if the token is expired
            if (decodedUser.exp * 1000 < Date.now()) {
                localStorage.removeItem('authToken');
                setUser(null);
            } else {
                setUser({ 
                    username: decodedUser.username, 
                    role: decodedUser.role, 
                    dispatchGroupId: decodedUser.dispatchGroupId,
                    passwordChangeRequired: decodedUser.passwordChangeRequired
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
      
      // Navigate to the correct dashboard based on role
      if (userData.passwordChangeRequired) {
        navigate('/force-password-change');
      } else if (userData.role === 'Administrator') {
        navigate('/dashboard');
      } else if (userData.role === 'Dispatcher') {
        navigate('/dispatcher-dashboard');
      } else {
        navigate('/'); // Fallback to root
      }

    } catch (error) {
      console.error('Login failed:', error);
      throw error; // Re-throw the error so the login page can display a message
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setUser(null);
    navigate('/login');
  };

  const value = {
    user,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to easily use the auth context in any component
export const useAuth = () => {
  return useContext(AuthContext);
};