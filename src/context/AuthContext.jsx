import React, { createContext, useContext, useState, useEffect } from 'react';
import { notifications as mockNotifications, alerts as mockAlerts } from '../data/mockData';

const AuthContext = createContext();
const AUTH_STATE_KEY = 'auth_state';

const parseStoredJson = (key, fallback) => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

export const AuthProvider = ({ children }) => {
  const [authenticated, setAuthenticated] = useState(false);
  const [role, setRole] = useState(null);
  const [user, setUser] = useState(null);

  const [settings, setSettings] = useState({
    attendanceThreshold: 75,
    academicThreshold: 60,
    maxScholarship: 50000,
    homeVisitFrequency: 'Monthly'
  });

  const [notifications, setNotifications] = useState(mockNotifications);

  // Auto-sync Alerts to Notifications
  useEffect(() => {
    // Only trigger for 'Open' or 'Critical' alerts that don't have a notification yet
    const openAlerts = mockAlerts.filter(a => a.status === 'Open' || a.severity === 'Critical');
    
    openAlerts.forEach(alert => {
      const exists = notifications.some(n => n.description.includes(alert.studentName) && n.title.includes(alert.type));
      if (!exists) {
        addNotification(
          `System Alert: ${alert.type}`,
          `${alert.studentName}: ${alert.message}`,
          alert.severity === 'Critical' ? 'Warning' : 'Info'
        );
      }
    });
  }, [notifications.length]); // Simple check for length change as proxy for initialization or updates

  // Load from local storage on mount
  useEffect(() => {
    const storedAuth = parseStoredJson(AUTH_STATE_KEY, null);
    if (storedAuth) {
      const { authenticated, role, user, settings: storedSettings, notifications: storedNotifications } = storedAuth;
      setAuthenticated(authenticated);
      setRole(role);
      setUser(user);
      if (storedSettings) setSettings(storedSettings);
      if (storedNotifications) setNotifications(storedNotifications);
    }
  }, []);

  const saveToStorage = (updates) => {
    const currentState = parseStoredJson(AUTH_STATE_KEY, {});
    const newState = { ...currentState, ...updates };
    localStorage.setItem(AUTH_STATE_KEY, JSON.stringify(newState));
  };

  const createSession = (account) => {
    const sessionUser = {
      id: account.id,
      name: account.name,
      email: account.email,
      organization: account.organization,
    };
    const newState = {
      authenticated: true,
      role: account.role,
      user: sessionUser,
      settings,
      notifications,
    };
    setAuthenticated(true);
    setRole(account.role);
    setUser(sessionUser);
    saveToStorage(newState);
    return sessionUser;
  };

  const loginAs = (selectedRole) => {
    const demoUser = {
      id: `demo-${selectedRole.toLowerCase()}`,
      name: `Mock ${selectedRole.charAt(0) + selectedRole.slice(1).toLowerCase()}`,
      email: 'user@example.com',
      role: selectedRole,
      organization: 'Sneha Asha',
    };
    createSession(demoUser);
  };

  const updateSettings = (newSettings) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    saveToStorage({ settings: updated });
  };

  const addNotification = (title, description, type = 'Info') => {
    const newNotif = {
      id: `n${Date.now()}`,
      title,
      description,
      type,
      read: false,
      time: 'Just now'
    };
    const updated = [newNotif, ...notifications];
    setNotifications(updated);
    saveToStorage({ notifications: updated });
  };

  const markNotificationRead = (id) => {
    const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    setNotifications(updated);
    saveToStorage({ notifications: updated });
  };

  const clearNotifications = () => {
    setNotifications([]);
    saveToStorage({ notifications: [] });
  };

  const logout = () => {
    setAuthenticated(false);
    setRole(null);
    setUser(null);
    localStorage.removeItem(AUTH_STATE_KEY);
  };

  return (
    <AuthContext.Provider value={{
      authenticated, role, user, settings, notifications,
      loginAs, logout, updateSettings, addNotification, markNotificationRead, clearNotifications
    }}>
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
