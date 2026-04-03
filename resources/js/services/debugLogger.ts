// Shared debug logger for offline sync modules
// Debug mode can be enabled via the reader.debug_mode setting

import api from '@/api/client';

let debugEnabled = false;
let erudaLoaded = false;
let flushInterval: ReturnType<typeof setInterval> | null = null;

// Store logs in memory for easy copy/paste
const logBuffer: string[] = [];
const pendingLogs: string[] = [];
const MAX_LOG_BUFFER = 500;
const FLUSH_INTERVAL_MS = 2000;

function addToBuffer(level: string, prefix: string, message: string, data?: unknown): void {
    // Only buffer logs if debug mode is enabled
    if (!debugEnabled) return;

    const timestamp = new Date().toISOString().substring(11, 23);
    let logLine = `[${timestamp}] [${level}] [${prefix}] ${message}`;
    if (data !== undefined) {
        try {
            logLine += ' ' + JSON.stringify(data);
        } catch {
            logLine += ' [non-serializable data]';
        }
    }
    logBuffer.push(logLine);
    pendingLogs.push(logLine);
    if (logBuffer.length > MAX_LOG_BUFFER) {
        logBuffer.shift();
    }
}

// Send logs to server periodically
async function flushLogsToServer(): Promise<void> {
    // Don't send if debug mode is disabled or no logs
    if (!debugEnabled || pendingLogs.length === 0) return;

    const logsToSend = [...pendingLogs];
    pendingLogs.length = 0;

    try {
        await api.post('/debug/logs', { logs: logsToSend });
    } catch {
        // Re-add logs if send failed
        pendingLogs.unshift(...logsToSend);
    }
}

// Expose functions globally for easy access from console/Eruda
if (typeof window !== 'undefined') {
    (window as any).getDebugLogs = () => logBuffer.join('\n');
    (window as any).copyDebugLogs = () => {
        const logs = logBuffer.join('\n');
        navigator.clipboard.writeText(logs).then(() => {
            console.log(`[Debug] ${logBuffer.length} logs copied to clipboard!`);
        }).catch(() => {
            // Fallback: show in alert for manual copy
            console.log('[Debug] Clipboard failed, logs:', logs);
        });
        return logs;
    };
    (window as any).clearDebugLogs = () => {
        logBuffer.length = 0;
        console.log('[Debug] Logs cleared');
    };
    (window as any).flushDebugLogs = flushLogsToServer;
}

export function setDebugMode(enabled: boolean): void {
    debugEnabled = enabled;

    if (enabled) {
        // Start periodic flush to server
        if (!flushInterval) {
            flushInterval = setInterval(flushLogsToServer, FLUSH_INTERVAL_MS);
            // Also flush on page hide (user switching apps)
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'hidden') {
                    flushLogsToServer();
                }
            });
        }

        // Load Eruda mobile console when debug mode is enabled
        if (!erudaLoaded && typeof window !== 'undefined') {
            erudaLoaded = true;
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/eruda';
            script.onload = () => {
                (window as any).eruda?.init();
                console.log('[Debug] Eruda loaded. Logs are sent to server every 2s.');
                console.log('[Debug] View logs on PC: /api/debug/logs');
            };
            document.head.appendChild(script);
        }
    } else {
        // Stop periodic flush
        if (flushInterval) {
            clearInterval(flushInterval);
            flushInterval = null;
        }
    }
}

export function isDebugEnabled(): boolean {
    return debugEnabled;
}

export function debugLog(prefix: string, message: string, data?: unknown): void {
    if (!debugEnabled) return;

    addToBuffer('LOG', prefix, message, data);

    if (data !== undefined) {
        console.log(`[${prefix}] ${message}`, data);
    } else {
        console.log(`[${prefix}] ${message}`);
    }
}

export function debugWarn(prefix: string, message: string, data?: unknown): void {
    if (!debugEnabled) return;

    addToBuffer('WARN', prefix, message, data);

    if (data !== undefined) {
        console.warn(`[${prefix}] ${message}`, data);
    } else {
        console.warn(`[${prefix}] ${message}`);
    }
}

// Always log errors regardless of debug mode
export function debugError(prefix: string, message: string, error?: unknown): void {
    addToBuffer('ERROR', prefix, message, error);

    if (error !== undefined) {
        console.error(`[${prefix}] ${message}`, error);
    } else {
        console.error(`[${prefix}] ${message}`);
    }
}
