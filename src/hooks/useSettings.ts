/**
 * useSettings Hook
 * User preferences with localStorage persistence
 */

import { useState, useEffect, useCallback } from 'react';

export type FontSize = 'small' | 'medium' | 'large';

interface Settings {
  fontSize: FontSize;
}

const DEFAULT_SETTINGS: Settings = {
  fontSize: 'medium',
};

const STORAGE_KEY = 'gstock-settings';

const FONT_SIZE_MAP: Record<FontSize, string> = {
  small: '12px',
  medium: '14px',
  large: '16px',
};

export const useSettings = () => {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (typeof window === 'undefined' || !isLoaded) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings, isLoaded]);

  // Apply font size to document
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.style.setProperty('--base-font-size', FONT_SIZE_MAP[settings.fontSize]);
  }, [settings.fontSize]);

  const setFontSize = useCallback((size: FontSize) => {
    setSettings(prev => ({ ...prev, fontSize: size }));
  }, []);

  return {
    settings,
    setFontSize,
    isLoaded,
  };
};
