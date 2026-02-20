import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function ReaderPage() {
    const { t } = useTranslation();
    const { id } = useParams<{ id: string }>();

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
            <div className="text-center">
                <h1 className="text-2xl font-bold text-white mb-4">
                    {t('Loading book...')}
                </h1>
                <p className="text-gray-400">
                    Reader page placeholder (Book #{id}). Will be implemented in Step 5.
                </p>
            </div>
        </div>
    );
}
