import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const API_URL =
  import.meta.env.VITE_API_URL ||
  'http://127.0.0.1:8000/api';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('user');
    try {
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (e) {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    setLoading(false);
  }, [token]);

  const login = async (username, password) => {
    try {
      const response = await axios.post(`${API_URL}/auth/login/`, { username, password });
      const { access, user: userData } = response.data;
      
      setUser(userData);
      setToken(access);
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('token', access);
      
      axios.defaults.headers.common['Authorization'] = `Bearer ${access}`;
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Invalid username or password.'
      };
    }
  };

  const register = async (username, email, password, confirmPassword, fullName) => {
    try {
      await axios.post(`${API_URL}/auth/register/`, {
        username,
        email,
        password,
        confirm_password: confirmPassword,
        full_name: fullName
      });
      return { success: true };
    } catch (error) {
      const errs = error.response?.data;
      let errorMsg = 'Registration failed.';
      if (errs) {
        if (typeof errs === 'object') {
          errorMsg = Object.entries(errs)
            .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : val}`)
            .join(' | ');
        } else {
          errorMsg = errs;
        }
      }
      return { success: false, error: errorMsg };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await axios.patch(`${API_URL}/auth/profile/`, profileData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      });
      const updatedUser = response.data;
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to update profile.'
      };
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
