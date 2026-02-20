import { useTranslation } from 'react-i18next';

export function UsersPage() {
    const { t } = useTranslation();

    return (
        <div>
            <h1 className="text-2xl font-bold text-white mb-6">{t('Users Management')}</h1>
            <p className="text-gray-400">
                Admin users page placeholder. Will be implemented in Step 4.
            </p>
        </div>
    );
}
