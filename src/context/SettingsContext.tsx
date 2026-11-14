import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getTranslation, type TranslationDict } from '../i18n';
import {
  DEFAULT_APP_SETTINGS,
  type AppSettings,
  type AppThemeId,
  type LanguageCode,
} from '../types/settings';

const SETTINGS_STORAGE_KEY = 'camcall_settings_v2';

interface SettingsContextValue {
  settings: AppSettings;
  t: TranslationDict;
  lang: LanguageCode;
  updateSettings: (patch: Partial<AppSettings>) => void;
  setLanguage: (lang: LanguageCode) => void;
  setTheme: (theme: AppThemeId) => void;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function normalizeAppSettings(raw: unknown): AppSettings {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_APP_SETTINGS };
  const input = raw as Partial<AppSettings>;
  return {
    ...DEFAULT_APP_SETTINGS,
    ...input,
    language: input.language === 'id' ? 'id' : 'en',
    theme: ['pink', 'soft-pink', 'lavender', 'white-minimalist', 'dark'].includes(
      String(input.theme)
    )
      ? (input.theme as AppThemeId)
      : DEFAULT_APP_SETTINGS.theme,
    colorMode: input.colorMode === 'dark' ? 'dark' : 'light',
    textSize: ['sm', 'md', 'lg'].includes(String(input.textSize))
      ? (input.textSize as AppSettings['textSize'])
      : 'md',
    glassTransparency:
      typeof input.glassTransparency === 'number'
        ? Math.min(100, Math.max(65, input.glassTransparency))
        : DEFAULT_APP_SETTINGS.glassTransparency,
    defaultZoom:
      typeof input.defaultZoom === 'number'
        ? Math.min(2.5, Math.max(1.0, input.defaultZoom))
        : 1.0,
  };
}

function loadInitialSettings(): AppSettings {
  if (typeof window === 'undefined') return { ...DEFAULT_APP_SETTINGS };
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_APP_SETTINGS };
    return normalizeAppSettings(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_APP_SETTINGS };
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(loadInitialSettings);

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Ignore storage quota errors
    }

    const root = document.documentElement;
    const isDark = settings.theme === 'dark' || settings.colorMode === 'dark';
    root.classList.toggle('dark', isDark);
    root.setAttribute('data-theme', settings.theme);
    root.setAttribute('data-text-size', settings.textSize);
    root.classList.toggle(
      'reduce-motion',
      settings.reduceMotion || !settings.animationsEnabled
    );
    root.style.setProperty('--camcall-glass-alpha', (settings.glassTransparency / 100).toFixed(2));
    root.lang = settings.language;
  }, [settings]);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => normalizeAppSettings({ ...prev, ...patch }));
  }, []);

  const setLanguage = useCallback((language: LanguageCode) => {
    setSettings((prev) => ({ ...prev, language }));
  }, []);

  const setTheme = useCallback((theme: AppThemeId) => {
    setSettings((prev) => ({
      ...prev,
      theme,
      colorMode: theme === 'dark' ? 'dark' : prev.theme === 'dark' ? 'light' : prev.colorMode,
    }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings({ ...DEFAULT_APP_SETTINGS });
  }, []);

  const t = useMemo(() => getTranslation(settings.language), [settings.language]);

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      t,
      lang: settings.language,
      updateSettings,
      setLanguage,
      setTheme,
      resetSettings,
    }),
    [settings, t, updateSettings, setLanguage, setTheme, resetSettings]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings must be used inside SettingsProvider');
  }
  return ctx;
}
