import { useEffect, useState, useCallback } from "react";
import { loadTheme, saveTheme, type ThemeSettings } from "@/lib/theme";

/**
 * Hook for reading and updating the board/piece theme.
 * Persists to localStorage and syncs across components via a custom event.
 */
import { STORAGE_KEYS } from "@/lib/brand";

const THEME_EVENT = STORAGE_KEYS.themeEvent;

export function useTheme() {
  const [settings, setSettings] = useState<ThemeSettings>(() => loadTheme());

  useEffect(() => {
    const handler = () => setSettings(loadTheme());
    window.addEventListener(THEME_EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(THEME_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const update = useCallback((next: ThemeSettings) => {
    saveTheme(next);
    setSettings(next);
    window.dispatchEvent(new Event(THEME_EVENT));
  }, []);

  return { settings, update };
}
