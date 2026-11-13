import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext(null);

export const DEMO_ACCOUNTS = {
  admin: {
    username: 'admin',
    full_name: 'Victoria Sterling',
    role: 'Admin',
    email: 'admin@bankoperations.com',
    zone: 'Central',
    badge: 'Lead Operations Director',
  },
  user: {
    username: 'branch_user',
    full_name: 'David Miller',
    role: 'User',
    email: 'david.m@bankoperations.com',
    zone: 'North',
    badge: 'Branch Operations Officer',
  },
  handler: {
    username: 'john_tech',
    full_name: 'John Davis',
    role: 'Handler',
    email: 'john.d@bankoperations.com',
    zone: 'North',
    badge: 'Cash Dispenser Field Tech',
    handler_id: 'HND-01'
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('atm_user');
    return saved ? JSON.parse(saved) : DEMO_ACCOUNTS.admin;
  });

  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('atm_dark_mode');
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('atm_dark_mode', JSON.stringify(darkMode));
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(prev => !prev);
  };

  const login = async (username, password) => {
    try {
      const data = await authService.login(username, password);
      setUser(data.user);
      localStorage.setItem('atm_user', JSON.stringify(data.user));
      localStorage.setItem('atm_auth_token', data.token);
      return { success: true };
    } catch (err) {
      // Demo fallback if backend down
      const match = Object.values(DEMO_ACCOUNTS).find(a => a.username === username);
      if (match) {
        setUser(match);
        localStorage.setItem('atm_user', JSON.stringify(match));
        localStorage.setItem('atm_auth_token', 'demo-token');
        return { success: true };
      }
      return { success: false, error: err.response?.data?.error || 'Invalid credentials' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('atm_user');
    localStorage.removeItem('atm_auth_token');
  };

  const switchRole = (roleKey) => {
    const target = DEMO_ACCOUNTS[roleKey.toLowerCase()];
    if (target) {
      setUser(target);
      localStorage.setItem('atm_user', JSON.stringify(target));
      localStorage.setItem('atm_auth_token', `demo-${roleKey}-token`);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, switchRole, darkMode, toggleDarkMode }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
