import { useEffect, useRef, useCallback } from 'react';
import { debugLog, debugWarn } from '@/services/debugLogger';

/**
 * Hook to prevent screen from sleeping using the Screen Wake Lock API.
 * Automatically re-acquires the lock when the tab becomes visible again.
 *
 * @param enabled - Whether to enable the wake lock (default: true)
 * @returns Object with isSupported flag
 */
export function useWakeLock(enabled: boolean = true) {
    const wakeLockRef = useRef<WakeLockSentinel | null>(null);
    const isSupported = 'wakeLock' in navigator;

    const requestWakeLock = useCallback(async () => {
        if (!isSupported || !enabled) return;

        try {
            wakeLockRef.current = await navigator.wakeLock.request('screen');
            debugLog('WakeLock', 'Screen wake lock acquired');

            wakeLockRef.current.addEventListener('release', () => {
                debugLog('WakeLock', 'Screen wake lock released');
            });
        } catch (err) {
            // Wake lock request can fail if:
            // - Document is not visible
            // - System is low on battery
            // - User denied permission
            debugWarn('WakeLock', 'Failed to acquire', err);
        }
    }, [isSupported, enabled]);

    const releaseWakeLock = useCallback(async () => {
        if (wakeLockRef.current) {
            try {
                await wakeLockRef.current.release();
                wakeLockRef.current = null;
            } catch (err) {
                debugWarn('WakeLock', 'Failed to release', err);
            }
        }
    }, []);

    useEffect(() => {
        if (!isSupported || !enabled) return;

        // Request wake lock on mount
        requestWakeLock();

        // Re-acquire wake lock when tab becomes visible
        // (wake lock is automatically released when tab is hidden)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                requestWakeLock();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            releaseWakeLock();
        };
    }, [isSupported, enabled, requestWakeLock, releaseWakeLock]);

    return { isSupported };
}
