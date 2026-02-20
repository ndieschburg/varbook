import { useState, useCallback } from 'react';

export type Theme = 'light' | 'dark' | 'sepia';
export type FontFamily = 'default' | 'serif' | 'sans' | 'mono';
export type Margins = 'compact' | 'normal' | 'wide';
export type FlowMode = 'paginated' | 'scrolled';

interface ReaderSettings {
    theme: Theme;
    fontSize: number;
    fontFamily: FontFamily;
    lineHeight: number;
    margins: Margins;
    flowMode: FlowMode;
}

const defaultSettings: ReaderSettings = {
    theme: 'dark',
    fontSize: 100,
    fontFamily: 'default',
    lineHeight: 1.5,
    margins: 'normal',
    flowMode: 'paginated',
};

function loadSettings(): ReaderSettings {
    return {
        theme: (localStorage.getItem('reader-theme') as Theme) || defaultSettings.theme,
        fontSize: parseInt(localStorage.getItem('reader-font-size') || '') || defaultSettings.fontSize,
        fontFamily: (localStorage.getItem('reader-font-family') as FontFamily) || defaultSettings.fontFamily,
        lineHeight: parseFloat(localStorage.getItem('reader-line-height') || '') || defaultSettings.lineHeight,
        margins: (localStorage.getItem('reader-margins') as Margins) || defaultSettings.margins,
        flowMode: (localStorage.getItem('reader-flow') as FlowMode) || defaultSettings.flowMode,
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

    const setFlowMode = useCallback((flowMode: FlowMode) => {
        localStorage.setItem('reader-flow', flowMode);
        setSettings(prev => ({ ...prev, flowMode }));
    }, []);

    return {
        settings,
        setTheme,
        setFontSize,
        setFontFamily,
        setLineHeight,
        setMargins,
        setFlowMode,
    };
}

export const themeStyles = {
    light: { background: '#ffffff', color: '#1a1a1a' },
    dark: { background: '#1e293b', color: '#e2e8f0' },
    sepia: { background: '#f4ecd8', color: '#5c4b37' },
};

export const fontFamilies = {
    default: 'inherit',
    serif: 'Georgia, "Times New Roman", serif',
    sans: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    mono: 'ui-monospace, "Cascadia Code", "Source Code Pro", monospace',
};

export const marginValues = {
    compact: { side: 20, top: 10 },
    normal: { side: 50, top: 20 },
    wide: { side: 100, top: 40 },
};
