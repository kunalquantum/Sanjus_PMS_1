import React, { createContext, useContext, useState, useEffect } from 'react';
import { notifications as mockNotifications, alerts as mockAlerts } from '../data/mockData';

const AuthContext = createContext();

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
    const storedAuth = localStorage.getItem('auth_state');
    if (storedAuth) {
      const { authenticated, role, user, settings: storedSettings, notifications: storedNotifications } = JSON.parse(storedAuth);
      setAuthenticated(authenticated);
      setRole(role);
      setUser(user);
      if (storedSettings) setSettings(storedSettings);
      if (storedNotifications) setNotifications(storedNotifications);
    }
  }, []);

  const saveToStorage = (updates) => {
    const currentState = JSON.parse(localStorage.getItem('auth_state') || '{}');
    const newState = { ...currentState, ...updates };
    localStorage.setItem('auth_state', JSON.stringify(newState));
  };

  const loginAs = (selectedRole) => {
    const newState = {
      authenticated: true,
      role: selectedRole,
      user: { name: `Mock ${selectedRole.charAt(0) + selectedRole.slice(1).toLowerCase()}`, email: 'user@example.com' },
      settings,
      notifications
    };
    setAuthenticated(newState.authenticated);
    setRole(newState.role);
    setUser(newState.user);
    saveToStorage(newState);
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
    localStorage.removeItem('auth_state');
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
