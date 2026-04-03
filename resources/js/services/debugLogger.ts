// Shared debug logger for offline sync modules
// Debug mode can be enabled via the reader.debug_mode setting

let debugEnabled = false;
let erudaLoaded = false;

export function setDebugMode(enabled: boolean): void {
    debugEnabled = enabled;

    // Load Eruda mobile console when debug mode is enabled
    if (enabled && !erudaLoaded && typeof window !== 'undefined') {
        erudaLoaded = true;
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/eruda';
        script.onload = () => {
            (window as any).eruda?.init();
            console.log('[Debug] Eruda console loaded');
        };
        document.head.appendChild(script);
    }
}

export function isDebugEnabled(): boolean {
    return debugEnabled;
}

export function debugLog(prefix: string, message: string, data?: unknown): void {
    if (!debugEnabled) return;

    if (data !== undefined) {
        console.log(`[${prefix}] ${message}`, data);
    } else {
        console.log(`[${prefix}] ${message}`);
    }
}

export function debugWarn(prefix: string, message: string, data?: unknown): void {
    if (!debugEnabled) return;

    if (data !== undefined) {
        console.warn(`[${prefix}] ${message}`, data);
    } else {
        console.warn(`[${prefix}] ${message}`);
    }
}

// Always log errors regardless of debug mode
export function debugError(prefix: string, message: string, error?: unknown): void {
    if (error !== undefined) {
        console.error(`[${prefix}] ${message}`, error);
    } else {
        console.error(`[${prefix}] ${message}`);
    }
}
