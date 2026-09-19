/**
 * useSettings — reads app settings from localStorage.
 * Returns defaults if nothing is stored yet.
 */
import { useState, useEffect } from 'react';
import type { AppSettings } from '@/types';
import { DEFAULT_SETTINGS } from '@/data/mockData';

const STORAGE_KEY = 'vyapari_settings';

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const updateSettings = (updates: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...updates };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  return { settings, updateSettings };
}
