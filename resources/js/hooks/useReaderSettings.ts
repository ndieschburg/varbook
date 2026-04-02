import { useState, useCallback } from 'react';

export type Theme = 'light' | 'dark' | 'sepia';
export type FontFamily = 'default' | 'literata' | 'merriweather' | 'lora' | 'inter' | 'opensans' | 'dyslexic';
export type Margins = 'compact' | 'normal' | 'wide';

interface ReaderSettings {
    theme: Theme;
    fontSize: number;
    fontFamily: FontFamily;
    lineHeight: number;
    margins: Margins;
    textSelection: boolean;
    fullscreenLock: boolean;
}

const defaultSettings: ReaderSettings = {
    theme: 'dark',
    fontSize: 100,
    fontFamily: 'default',
    lineHeight: 1.5,
    margins: 'normal',
    textSelection: false,
    fullscreenLock: false,
};

function loadSettings(): ReaderSettings {
    const textSelectionStored = localStorage.getItem('reader-text-selection');
    const fullscreenLockStored = localStorage.getItem('reader-fullscreen-lock');
    return {
        theme: (localStorage.getItem('reader-theme') as Theme) || defaultSettings.theme,
        fontSize: parseInt(localStorage.getItem('reader-font-size') || '') || defaultSettings.fontSize,
        fontFamily: (localStorage.getItem('reader-font-family') as FontFamily) || defaultSettings.fontFamily,
        lineHeight: parseFloat(localStorage.getItem('reader-line-height') || '') || defaultSettings.lineHeight,
        margins: (localStorage.getItem('reader-margins') as Margins) || defaultSettings.margins,
        textSelection: textSelectionStored !== null ? textSelectionStored === 'true' : defaultSettings.textSelection,
        fullscreenLock: fullscreenLockStored !== null ? fullscreenLockStored === 'true' : defaultSettings.fullscreenLock,
    };
}

export function useReaderSettings() {
    const [settings, setSettings] = useState<ReaderSettings>(loadSettings);

    const setTheme = useCallback((theme: Theme) => {
        localStorage.setItem('reader-theme', theme);
        setSettings(prev => ({ ...prev, theme }));
    }, []);

    const setFontSize = useCallback((fontSize: number) => {
        const clamped = Math.max(50, Math.min(200, fontSize));
        localStorage.setItem('reader-font-size', String(clamped));
        setSettings(prev => ({ ...prev, fontSize: clamped }));
    }, []);

    const setFontFamily = useCallback((fontFamily: FontFamily) => {
        localStorage.setItem('reader-font-family', fontFamily);
        setSettings(prev => ({ ...prev, fontFamily }));
    }, []);

    const setLineHeight = useCallback((lineHeight: number) => {
        const clamped = Math.max(1.0, Math.min(2.5, lineHeight));
        localStorage.setItem('reader-line-height', String(clamped));
        setSettings(prev => ({ ...prev, lineHeight: clamped }));
    }, []);

    const setMargins = useCallback((margins: Margins) => {
        localStorage.setItem('reader-margins', margins);
        setSettings(prev => ({ ...prev, margins }));
    }, []);

    const setTextSelection = useCallback((textSelection: boolean) => {
        localStorage.setItem('reader-text-selection', String(textSelection));
        setSettings(prev => ({ ...prev, textSelection }));
    }, []);

    const setFullscreenLock = useCallback((fullscreenLock: boolean) => {
        localStorage.setItem('reader-fullscreen-lock', String(fullscreenLock));
        setSettings(prev => ({ ...prev, fullscreenLock }));
    }, []);

    return {
        settings,
        setTheme,
        setFontSize,
        setFontFamily,
        setLineHeight,
        setMargins,
        setTextSelection,
        setFullscreenLock,
    };
}

export const themeStyles = {
    light: { background: '#ffffff', color: '#1a1a1a' },
    dark: { background: '#1e293b', color: '#e2e8f0' },
    sepia: { background: '#f4ecd8', color: '#5c4b37' },
};

/** Tailwind CSS classes for theme backgrounds (used in ReaderPage container) */
export const themeBackgrounds: Record<Theme, string> = {
    light: 'bg-white',
    dark: 'bg-slate-800',
    sepia: 'bg-[#f4ecd8]',
};

export const fontFamilies: Record<FontFamily, string> = {
    default: 'inherit',
    literata: '"Literata", Georgia, serif',
    merriweather: '"Merriweather", Georgia, serif',
    lora: '"Lora", Georgia, serif',
    inter: '"Inter", system-ui, sans-serif',
    opensans: '"Open Sans", system-ui, sans-serif',
    dyslexic: '"OpenDyslexic", Arial, sans-serif',
};

export const marginValues = {
    compact: { side: 20, top: 10 },
    normal: { side: 50, top: 20 },
    wide: { side: 100, top: 40 },
};
