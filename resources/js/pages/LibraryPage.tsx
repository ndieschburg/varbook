import { useTranslation } from 'react-i18next';
import { LoadingSpinner } from '@/components/ui';

export function LibraryPage() {
    const { t } = useTranslation();

    return (
        <div>
            <h1 className="text-2xl font-bold text-white mb-6">{t('Library')}</h1>
            <p className="text-gray-400">
                Library page placeholder. Will be implemented in Step 4.
            </p>
        </div>
    );
}
