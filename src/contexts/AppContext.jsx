import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as DataService from '../services/DataService.js';
import { useAuth } from './AuthContext.jsx';

const AppContext = createContext(null);

const FONT_LEVELS = ['small', 'medium', 'large', 'xlarge', 'huge'];

export function AppProvider({ children }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    theme: 'light',
    fontSize: 'medium',
    dyslexiaFont: false,
    reducedMotion: false,
    notifications: true,
  });
  const [gamification, setGamification] = useState(null);
  const [isTranscriptionOpen, setIsTranscriptionOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const s = DataService.getSettings(user.id);
    setSettings(prev => ({ ...prev, ...s }));
    const g = DataService.getGamification(user.id);
    setGamification(g);
  }, [user]);

  // Apply theme, font scale and accessibility modes to root HTML
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', settings.theme || 'light');
    root.setAttribute('data-font-size', settings.fontSize || 'medium');
    if (settings.dyslexiaFont) {
      root.setAttribute('data-dyslexia', 'true');
    } else {
      root.removeAttribute('data-dyslexia');
    }
    if (settings.reducedMotion) {
      root.setAttribute('data-reduced-motion', 'true');
    } else {
      root.removeAttribute('data-reduced-motion');
    }
  }, [settings]);

  const updateSettings = useCallback((newSettings) => {
    if (!user) return;
    const merged = { ...settings, ...newSettings };
    DataService.saveSettings(user.id, merged);
    setSettings(merged);
  }, [user, settings]);

  const increaseFontSize = useCallback(() => {
    const currentIndex = FONT_LEVELS.indexOf(settings.fontSize || 'medium');
    const nextIndex = Math.min(FONT_LEVELS.length - 1, (currentIndex === -1 ? 1 : currentIndex) + 1);
    updateSettings({ fontSize: FONT_LEVELS[nextIndex] });
  }, [settings.fontSize, updateSettings]);

  const decreaseFontSize = useCallback(() => {
    const currentIndex = FONT_LEVELS.indexOf(settings.fontSize || 'medium');
    const nextIndex = Math.max(0, (currentIndex === -1 ? 1 : currentIndex) - 1);
    updateSettings({ fontSize: FONT_LEVELS[nextIndex] });
  }, [settings.fontSize, updateSettings]);

  const toggleHighContrast = useCallback(() => {
    if (settings.theme === 'highcontrast' || settings.theme === 'highcontrast-white') {
      updateSettings({ theme: 'light' });
    } else {
      updateSettings({ theme: 'highcontrast' });
    }
  }, [settings.theme, updateSettings]);

  const toggleVeryLowVision = useCallback(() => {
    if (settings.fontSize === 'huge' || settings.fontSize === 'xlarge') {
      updateSettings({ fontSize: 'medium' });
    } else {
      updateSettings({ fontSize: 'xlarge', theme: settings.theme.includes('highcontrast') ? settings.theme : 'highcontrast' });
    }
  }, [settings.fontSize, settings.theme, updateSettings]);

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
    <AppContext.Provider value={{
      settings,
      updateSettings,
      increaseFontSize,
      decreaseFontSize,
      toggleHighContrast,
      toggleVeryLowVision,
      isTranscriptionOpen,
      setIsTranscriptionOpen,
      gamification,
      awardPoints,
      refreshGamification,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

