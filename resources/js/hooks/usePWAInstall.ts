import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{
        outcome: 'accepted' | 'dismissed';
        platform: string;
    }>;
    prompt(): Promise<void>;
}

const DISMISSED_KEY = 'pwa-install-dismissed';
const DISMISSED_EXPIRY_DAYS = 7; // Show again after 7 days

function isDismissedRecently(): boolean {
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (!dismissed) return false;

    const dismissedAt = parseInt(dismissed, 10);
    const expiryMs = DISMISSED_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
    return Date.now() - dismissedAt < expiryMs;
}

function setDismissed(): void {
    localStorage.setItem(DISMISSED_KEY, Date.now().toString());
}

export function usePWAInstall() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isInstalled, setIsInstalled] = useState(false);
    const [isDismissed, setIsDismissed] = useState(isDismissedRecently);

    useEffect(() => {
        // Check if already installed (standalone mode)
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
            return;
        }

        // Check iOS standalone
        if ((navigator as any).standalone === true) {
            setIsInstalled(true);
            return;
        }

        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
        };

        const handleAppInstalled = () => {
            setIsInstalled(true);
            setDeferredPrompt(null);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const promptInstall = useCallback(async (): Promise<boolean> => {
        if (!deferredPrompt) return false;

        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            setIsInstalled(true);
        }

        setDeferredPrompt(null);
        return outcome === 'accepted';
    }, [deferredPrompt]);

    const dismiss = useCallback(() => {
        setDismissed();
        setIsDismissed(true);
    }, []);

    return {
        canInstall: !!deferredPrompt && !isInstalled && !isDismissed,
        isInstalled,
        promptInstall,
        dismiss,
    };
}
