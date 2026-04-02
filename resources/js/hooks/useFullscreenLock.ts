import { useEffect, useRef, useState, useCallback } from 'react';

interface UseFullscreenLockOptions {
    enabled: boolean;
    debug?: (message: string, data?: any) => void;
}

interface UseFullscreenLockReturn {
    needsRestore: boolean;
    restore: () => Promise<void>;
}

/**
 * Hook to manage fullscreen + orientation lock for mobile reading
 *
 * @description Automatically enters fullscreen and locks orientation to portrait
 * when enabled. Shows restore overlay when fullscreen is lost (e.g., after sleep).
 *
 * @param options.enabled - Whether fullscreen lock is enabled
 * @param options.debug - Optional debug logging function
 *
 * @example
 * const { needsRestore, restore } = useFullscreenLock({
 *     enabled: settings.fullscreenLock,
 *     debug: (msg, data) => console.log(msg, data),
 * });
 */
export function useFullscreenLock({ enabled, debug = () => {} }: UseFullscreenLockOptions): UseFullscreenLockReturn {
    const [needsRestore, setNeedsRestore] = useState(false);
    const orientationLockedRef = useRef(false);

    // Restore fullscreen + orientation lock (must be called from user gesture)
    const restore = useCallback(async () => {
        if (!enabled) return;

        try {
            if (!document.fullscreenElement) {
                await document.documentElement.requestFullscreen();
                await new Promise((resolve) => setTimeout(resolve, 100));
            }
            if (screen.orientation?.lock) {
                await screen.orientation.lock('portrait');
                orientationLockedRef.current = true;
                debug('Fullscreen lock restored');
            }

            setNeedsRestore(false);
            debug('Fullscreen restored');
        } catch (error: any) {
            debug('Fullscreen restore failed', error);
            orientationLockedRef.current = false;
            setNeedsRestore(false);
        }
    }, [enabled, debug]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            try {
                screen.orientation?.unlock?.();
                if (document.fullscreenElement) {
                    document.exitFullscreen?.();
                }
            } catch {
                // Ignore
            }
        };
    }, []);

    // Main effect: handle fullscreen lock state
    useEffect(() => {
        if (!enabled) {
            // Setting disabled - remove locks if active
            if (orientationLockedRef.current) {
                try {
                    screen.orientation?.unlock?.();
                    orientationLockedRef.current = false;
                    if (document.fullscreenElement) {
                        document.exitFullscreen();
                    }
                    debug('Fullscreen lock removed');
                } catch {
                    // Ignore
                }
            }
            setNeedsRestore(false);
            return;
        }

        // Initial apply on mount or when setting is toggled ON
        const applyInitial = async () => {
            if (!document.fullscreenElement) {
                try {
                    await document.documentElement.requestFullscreen();
                    await new Promise((resolve) => setTimeout(resolve, 100));
                    if (screen.orientation?.lock) {
                        await screen.orientation.lock('portrait');
                        orientationLockedRef.current = true;
                        debug('Initial fullscreen lock applied');
                    }
                    setNeedsRestore(false);
                } catch (error: any) {
                    debug('Initial fullscreen lock failed', error);
                    setNeedsRestore(true);
                }
            }
        };
        applyInitial();

        // Detect when fullscreen is lost
        const handleFullscreenChange = () => {
            if (!document.fullscreenElement && enabled) {
                debug('Fullscreen lost, needs user gesture to restore');
                orientationLockedRef.current = false;
                setNeedsRestore(true);
            } else if (document.fullscreenElement && enabled) {
                setNeedsRestore(false);
            }
        };

        // Detect when app becomes visible after sleep
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && enabled && !document.fullscreenElement) {
                debug('Visibility changed to visible, fullscreen needs restore');
                orientationLockedRef.current = false;
                setNeedsRestore(true);
            }
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [enabled, debug]);

    return { needsRestore, restore };
}
