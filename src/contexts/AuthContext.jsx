import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as DataService from '../services/DataService.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = DataService.getSession();
    setUser(session);
    setLoading(false);
  }, []);

  const login = useCallback(async (credentials) => {
    const sessionUser = await DataService.login(credentials);
    setUser(sessionUser);
    return sessionUser;
  }, []);

  const register = useCallback(async (userData) => {
    const sessionUser = await DataService.register(userData);
    setUser(sessionUser);
    return sessionUser;
  }, []);

  const logout = useCallback(() => {
    DataService.logout();
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (updates) => {
    const updated = await DataService.updateUserProfile(user.id, updates);
    setUser(updated);
    return updated;
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
