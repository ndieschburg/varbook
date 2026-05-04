import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '@/api/client';
import { Button, ConfirmModal } from '@/components/ui';

interface ApiToken {
    id: number;
    name: string;
    prefix: string;
    last_used_at: string | null;
    created_at: string;
}

export function ApiTokenManager() {
    const { t } = useTranslation();
    const [tokens, setTokens] = useState<ApiToken[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newTokenName, setNewTokenName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [plainToken, setPlainToken] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [revokeTarget, setRevokeTarget] = useState<ApiToken | null>(null);
    const [isRevoking, setIsRevoking] = useState(false);

    const fetchTokens = useCallback(async () => {
        try {
            const { data } = await api.get('/tokens');
            setTokens(data.data);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTokens();
    }, [fetchTokens]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTokenName.trim()) return;

        setIsCreating(true);
        try {
            const { data } = await api.post('/tokens', { name: newTokenName.trim() });
            setPlainToken(data.data.token);
            setNewTokenName('');
            fetchTokens();
            toast.success(t('Token created successfully'));
        } catch (err: any) {
            toast.error(err.response?.data?.message || t('Failed to create token'));
        } finally {
            setIsCreating(false);
        }
    };

    const handleRevoke = async () => {
        if (!revokeTarget) return;

        setIsRevoking(true);
        try {
            await api.delete(`/tokens/${revokeTarget.id}`);
            setTokens(prev => prev.filter(t => t.id !== revokeTarget.id));
            toast.success(t('Token revoked successfully'));
        } catch (err: any) {
            toast.error(err.response?.data?.message || t('Failed to revoke token'));
        } finally {
            setIsRevoking(false);
            setRevokeTarget(null);
        }
    };

    const handleCopy = async (token: string) => {
        await navigator.clipboard.writeText(token);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return t('Never used');
        return new Date(dateStr).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                {t('API Tokens')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
                {t('Manage API tokens for external devices like e-readers.')}
            </p>

            {/* New token display */}
            {plainToken && (
                <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <p className="text-sm font-medium text-green-800 dark:text-green-300 mb-2">
                        {t("Copy this token now. It won't be shown again.")}
                    </p>
                    <div className="flex items-center gap-2">
                        <code className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-green-300 dark:border-green-700 rounded font-mono text-sm text-gray-900 dark:text-white select-all">
                            {plainToken}
                        </code>
                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleCopy(plainToken)}
                        >
                            {copied ? t('Copied!') : t('Copy')}
                        </Button>
                    </div>
                    <button
                        onClick={() => setPlainToken(null)}
                        className="mt-2 text-xs text-green-600 dark:text-green-400 hover:underline"
                    >
                        {t('Dismiss')}
                    </button>
                </div>
            )}

            {/* Create form */}
            <form onSubmit={handleCreate} className="flex gap-2 mb-4">
                <input
                    type="text"
                    value={newTokenName}
                    onChange={(e) => setNewTokenName(e.target.value)}
                    placeholder={t('e.g. Kobo Libra, Kindle')}
                    className="flex-1 px-3 py-2 bg-gray-100 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                />
                <Button type="submit" size="sm" isLoading={isCreating}>
                    {t('Generate new token')}
                </Button>
            </form>

            {/* Token list */}
            {isLoading ? (
                <p className="text-sm text-gray-500 dark:text-slate-400">...</p>
            ) : tokens.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-slate-400">{t('No tokens yet')}</p>
            ) : (
                <div className="space-y-2">
                    {tokens.map(token => (
                        <div
                            key={token.id}
                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg"
                        >
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <code className="text-xs font-mono text-gray-500 dark:text-slate-400">
                                        {token.prefix}
                                    </code>
                                    <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                        {token.name}
                                    </span>
                                </div>
                                <div className="flex gap-3 mt-1 text-xs text-gray-500 dark:text-slate-400">
                                    <span>
                                        {t('Last used')}: {formatDate(token.last_used_at)}
                                    </span>
                                    <span>
                                        {t('Created')}: {formatDate(token.created_at)}
                                    </span>
                                </div>
                            </div>
                            <Button
                                variant="danger"
                                size="sm"
                                onClick={() => setRevokeTarget(token)}
                            >
                                {t('Revoke')}
                            </Button>
                        </div>
                    ))}
                </div>
            )}

            {/* Revoke confirmation modal */}
            <ConfirmModal
                isOpen={!!revokeTarget}
                onClose={() => setRevokeTarget(null)}
                onConfirm={handleRevoke}
                title={t('Revoke token')}
                message={
                    <>
                        <p>{t('Are you sure you want to revoke this token?')}</p>
                        <p className="mt-1 text-sm">{t('The device using this token will no longer be able to sync.')}</p>
                    </>
                }
                confirmText={t('Revoke')}
                isLoading={isRevoking}
            />
        </div>
    );
}
