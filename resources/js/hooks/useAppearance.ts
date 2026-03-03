import { useEffect, useMemo } from 'react';
import { useSettings } from '@/api/hooks';

interface AppearanceSettings {
    accentColor: string;
    uiTheme: 'light' | 'dark' | 'system';
}

/**
 * Hook to manage appearance settings (accent color and UI theme).
 * Applies CSS variables and manages the dark mode class on <html>.
 */
export function useAppearance() {
    const { data: settingsData } = useSettings();

    // Extract appearance settings
    const appearance = useMemo<AppearanceSettings>(() => {
        if (!settingsData?.categories) {
            return { accentColor: '#6366f1', uiTheme: 'dark' };
        }
        const appearanceCategory = settingsData.categories.find(c => c.key === 'appearance');
        const getSetting = (key: string, defaultValue: unknown) => {
            const setting = appearanceCategory?.settings.find(s => s.key === key);
            return setting?.value ?? defaultValue;
        };
        return {
            accentColor: getSetting('appearance.accent_color', '#6366f1') as string,
            uiTheme: getSetting('appearance.ui_theme', 'dark') as 'light' | 'dark' | 'system',
        };
    }, [settingsData]);

    // Apply accent color as CSS variable
    useEffect(() => {
        document.documentElement.style.setProperty('--color-accent', appearance.accentColor);

        // Generate lighter/darker variants for hover states etc.
        // Convert hex to RGB for opacity variants
        const hex = appearance.accentColor.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        document.documentElement.style.setProperty('--color-accent-rgb', `${r}, ${g}, ${b}`);
    }, [appearance.accentColor]);

    // Apply UI theme (dark mode class management)
    useEffect(() => {
        const html = document.documentElement;

        const applyTheme = (isDark: boolean) => {
            if (isDark) {
                html.classList.add('dark');
            } else {
                html.classList.remove('dark');
            }
        };

        if (appearance.uiTheme === 'system') {
            // Use system preference
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            applyTheme(mediaQuery.matches);

            // Listen for system theme changes
            const handler = (e: MediaQueryListEvent) => {
                applyTheme(e.matches);
            };
            mediaQuery.addEventListener('change', handler);
            return () => mediaQuery.removeEventListener('change', handler);
        } else {
            // Use explicit setting
            applyTheme(appearance.uiTheme === 'dark');
        }
    }, [appearance.uiTheme]);

    return appearance;
}
