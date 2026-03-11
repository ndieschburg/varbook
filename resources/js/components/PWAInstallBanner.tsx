import { useTranslation } from 'react-i18next';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { DownloadIcon, XIcon } from '@/components/icons';

export function PWAInstallBanner() {
    const { t } = useTranslation();
    const { canInstall, promptInstall, dismiss } = usePWAInstall();

    if (!canInstall) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50">
            <div className="bg-indigo-600 rounded-lg shadow-lg p-4">
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 p-2 bg-indigo-500 rounded-lg">
                        <DownloadIcon className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white">
                            {t('Install Varbook')}
                        </p>
                        <p className="mt-1 text-sm text-indigo-200">
                            {t('Install the app for offline reading and quick access.')}
                        </p>
                        <div className="mt-3 flex gap-2">
                            <button
                                onClick={promptInstall}
                                className="px-3 py-1.5 bg-white text-indigo-600 text-sm font-medium rounded-md hover:bg-indigo-50 transition-colors"
                            >
                                {t('Install')}
                            </button>
                            <button
                                onClick={dismiss}
                                className="px-3 py-1.5 text-indigo-200 text-sm font-medium hover:text-white transition-colors"
                            >
                                {t('Not now')}
                            </button>
                        </div>
                    </div>
                    <button
                        onClick={dismiss}
                        className="flex-shrink-0 text-indigo-200 hover:text-white transition-colors"
                        aria-label={t('Dismiss')}
                    >
                        <XIcon className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
