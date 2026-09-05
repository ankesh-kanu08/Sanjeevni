import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';
import authService from '../services/authService';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('Sanjeevni_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const response = await authService.getMe();
          setUser(response.user || response);
        } catch (error) {
          console.error("Failed to authenticate token", error);
          localStorage.removeItem('Sanjeevni_token');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };
    initAuth();
  }, [token]);

  const login = async (email, password) => {
    try {
      const response = await authService.login(email, password);
      const { token: newToken, user: userData } = response;
      localStorage.setItem('Sanjeevni_token', newToken);
      setToken(newToken);
      setUser(userData);
      return userData;
    } catch (error) {
      throw error;
    }
  };

  const register = async (data) => {
    try {
      const response = await authService.register(data);
      const { token: newToken, user: userData } = response;
      localStorage.setItem('Sanjeevni_token', newToken);
      setToken(newToken);
      setUser(userData);
      return userData;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('Sanjeevni_token');
    setToken(null);
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      isAuthenticated: !!user,
      login,
      register,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};