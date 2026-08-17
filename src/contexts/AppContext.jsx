import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as DataService from '../services/DataService.js';
import { useAuth } from './AuthContext.jsx';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState({ theme: 'light', fontSize: 'medium', notifications: true });
  const [gamification, setGamification] = useState(null);

  useEffect(() => {
    if (!user) return;
    const s = DataService.getSettings(user.id);
    setSettings(s);
    const g = DataService.getGamification(user.id);
    setGamification(g);
  }, [user]);

  // Apply theme and font size to document
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', settings.theme);
    root.setAttribute('data-font-size', settings.fontSize);
  }, [settings]);

  const updateSettings = useCallback((newSettings) => {
    if (!user) return;
    const merged = { ...settings, ...newSettings };
    DataService.saveSettings(user.id, merged);
    setSettings(merged);
  }, [user, settings]);

  const awardPoints = useCallback((points, reason) => {
    if (!user) return { newAchievements: [] };
    const result = DataService.addPoints(user.id, points, reason);
    setGamification(result.data);
    return result;
  }, [user]);

  const refreshGamification = useCallback(() => {
    if (!user) return;
    setGamification(DataService.getGamification(user.id));
  }, [user]);

  return (
    <AppContext.Provider value={{ settings, updateSettings, gamification, awardPoints, refreshGamification }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
