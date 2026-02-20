import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function BookDetailPage() {
    const { t } = useTranslation();
    const { id } = useParams<{ id: string }>();

    return (
        <div>
            <h1 className="text-2xl font-bold text-white mb-6">
                Book #{id}
            </h1>
            <p className="text-gray-400">
                Book detail page placeholder. Will be implemented in Step 4.
            </p>
        </div>
    );
}
