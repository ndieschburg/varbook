// Shared network state tracking
// Detects when we're "effectively offline" (network errors despite navigator.onLine being true)

let effectivelyOffline = false;
let offlineUntil = 0;
const OFFLINE_DURATION_MS = 30000; // Don't retry API for 30 seconds after network error

// Reset offline state when browser reports online
if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
        console.log('[NetworkState] Browser online event - resetting offline state');
        effectivelyOffline = false;
        offlineUntil = 0;
    });
}

export function isNetworkError(error: unknown): boolean {
    if (error instanceof Error) {
        const message = error.message.toLowerCase();
        return (
            message.includes('network') ||
            message.includes('failed to fetch') ||
            message.includes('err_name_not_resolved') ||
            message.includes('err_internet_disconnected')
        );
    }
    return false;
}

export function isEffectivelyOffline(): boolean {
    if (!navigator.onLine) return true;
    return effectivelyOffline && Date.now() < offlineUntil;
}

export function markAsOffline(): void {
    console.log('[NetworkState] Network error detected - entering offline mode for 30s');
    effectivelyOffline = true;
    offlineUntil = Date.now() + OFFLINE_DURATION_MS;
}

export function markAsOnline(): void {
    if (effectivelyOffline) {
        console.log('[NetworkState] API success - clearing offline state');
        effectivelyOffline = false;
        offlineUntil = 0;
    }
}
