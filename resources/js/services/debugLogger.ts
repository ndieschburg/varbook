// Shared debug logger for offline sync modules
// Debug mode can be enabled via the reader.debug_mode setting

let debugEnabled = false;

export function setDebugMode(enabled: boolean): void {
    debugEnabled = enabled;
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
