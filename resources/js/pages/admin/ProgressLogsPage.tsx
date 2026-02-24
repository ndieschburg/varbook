import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useProgressLogs, useProgressLogsStats, useClearProgressLogs } from '@/api/hooks';
import { LoadingSpinner, Button, ConfirmModal } from '@/components/ui';
import type { ProgressLog } from '@/types';

export function ProgressLogsPage() {
    const { t } = useTranslation();
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [filters, setFilters] = useState<{
        action?: string;
        client?: string;
        success?: boolean;
    }>({});
    const [showClearModal, setShowClearModal] = useState(false);
    const [daysToKeep, setDaysToKeep] = useState(7);
    const logsEndRef = useRef<HTMLDivElement>(null);

    const { data: stats, isLoading: statsLoading } = useProgressLogsStats();
    const { data: logs, isLoading: logsLoading, refetch } = useProgressLogs(
        { per_page: 100, ...filters },
        { refetchInterval: autoRefresh ? 3000 : undefined }
    );
    const clearMutation = useClearProgressLogs();

    // Auto-scroll to bottom when new logs arrive
    useEffect(() => {
        if (autoRefresh && logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs?.data, autoRefresh]);

    const handleClear = async () => {
        try {
            const result = await clearMutation.mutateAsync(daysToKeep);
            toast.success(t('Deleted {{count}} old log entries', { count: result.deleted_count }));
            setShowClearModal(false);
        } catch {
            toast.error(t('Failed to clear logs'));
        }
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
        });
    };

    const getActionColor = (action: string) => {
        switch (action) {
            case 'web_put':
            case 'kosync_put':
                return 'text-green-400';
            case 'web_get':
            case 'kosync_get':
                return 'text-blue-400';
            case 'batch_sync':
                return 'text-purple-400';
            default:
                return 'text-slate-400';
        }
    };

    const getClientBadge = (client: string | null) => {
        if (!client) return null;
        const colors: Record<string, string> = {
            web: 'bg-indigo-600',
            koreader: 'bg-orange-600',
            moonreader: 'bg-blue-600',
        };
        return (
            <span className={`px-2 py-0.5 text-xs rounded ${colors[client] || 'bg-slate-600'}`}>
                {client}
            </span>
        );
    };

    if (statsLoading || logsLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">{t('Progress Logs')}</h1>
                    <p className="mt-1 text-slate-400">
                        {stats?.logging_enabled
                            ? t('Logging is enabled')
                            : t('Logging is disabled')}
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-slate-300">
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                            className="rounded bg-slate-700 border-slate-600 text-indigo-600"
                        />
                        {t('Auto-refresh')}
                    </label>
                    <Button variant="ghost" onClick={() => refetch()}>
                        {t('Refresh')}
                    </Button>
                    <Button variant="danger" onClick={() => setShowClearModal(true)}>
                        {t('Clear old logs')}
                    </Button>
                </div>
            </div>

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
                        <p className="text-sm text-slate-400">{t('Total logs')}</p>
                        <p className="text-2xl font-bold text-white">{stats.total_logs}</p>
                    </div>
                    <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
                        <p className="text-sm text-slate-400">{t('Today')}</p>
                        <p className="text-2xl font-bold text-white">{stats.logs_today}</p>
                    </div>
                    <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
                        <p className="text-sm text-slate-400">{t('Failed')}</p>
                        <p className="text-2xl font-bold text-red-400">{stats.failed_logs}</p>
                    </div>
                    <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
                        <p className="text-sm text-slate-400">{t('By client')}</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                            {Object.entries(stats.by_client || {}).map(([client, count]) => (
                                <span key={client} className="text-xs text-slate-300">
                                    {client}: {count}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-4 bg-slate-800 rounded-lg border border-slate-700 p-4">
                <select
                    value={filters.action || ''}
                    onChange={(e) => setFilters({ ...filters, action: e.target.value || undefined })}
                    className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                >
                    <option value="">{t('All actions')}</option>
                    <option value="web_put">web_put</option>
                    <option value="web_get">web_get</option>
                    <option value="batch_sync">batch_sync</option>
                    <option value="kosync_put">kosync_put</option>
                    <option value="kosync_get">kosync_get</option>
                </select>
                <select
                    value={filters.client || ''}
                    onChange={(e) => setFilters({ ...filters, client: e.target.value || undefined })}
                    className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                >
                    <option value="">{t('All clients')}</option>
                    <option value="web">web</option>
                    <option value="koreader">koreader</option>
                    <option value="moonreader">moonreader</option>
                </select>
                <select
                    value={filters.success === undefined ? '' : String(filters.success)}
                    onChange={(e) => setFilters({
                        ...filters,
                        success: e.target.value === '' ? undefined : e.target.value === 'true',
                    })}
                    className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                >
                    <option value="">{t('All status')}</option>
                    <option value="true">{t('Success')}</option>
                    <option value="false">{t('Failed')}</option>
                </select>
            </div>

            {/* Logs Table - Console style */}
            <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
                <div className="max-h-[60vh] overflow-y-auto font-mono text-sm">
                    {logs?.data && logs.data.length > 0 ? (
                        <table className="w-full">
                            <thead className="sticky top-0 bg-slate-800">
                                <tr className="text-left text-xs text-slate-400 uppercase">
                                    <th className="px-4 py-2 w-24">{t('Time')}</th>
                                    <th className="px-4 py-2 w-20">{t('Status')}</th>
                                    <th className="px-4 py-2 w-28">{t('Action')}</th>
                                    <th className="px-4 py-2 w-24">{t('Client')}</th>
                                    <th className="px-4 py-2">{t('Details')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {[...logs.data].reverse().map((log: ProgressLog) => (
                                    <tr
                                        key={log.id}
                                        className={`hover:bg-slate-800/50 ${!log.success ? 'bg-red-900/20' : ''}`}
                                    >
                                        <td className="px-4 py-2 text-slate-500 whitespace-nowrap">
                                            <span className="text-slate-600">{formatDate(log.created_at)}</span>
                                            {' '}
                                            {formatTime(log.created_at)}
                                        </td>
                                        <td className="px-4 py-2">
                                            {log.success ? (
                                                <span className="text-green-400">OK</span>
                                            ) : (
                                                <span className="text-red-400">ERR</span>
                                            )}
                                        </td>
                                        <td className={`px-4 py-2 ${getActionColor(log.action)}`}>
                                            {log.action}
                                        </td>
                                        <td className="px-4 py-2">
                                            {getClientBadge(log.client)}
                                        </td>
                                        <td className="px-4 py-2 text-slate-300">
                                            <div className="flex flex-wrap items-center gap-2">
                                                {log.book && (
                                                    <span className="text-slate-400">
                                                        [{log.book.title}]
                                                    </span>
                                                )}
                                                {log.request_data?.progress !== undefined && (
                                                    <span className="text-indigo-400">
                                                        {Number(log.request_data.progress).toFixed(1)}%
                                                    </span>
                                                )}
                                                {log.request_data?.position && (
                                                    <span className="text-slate-500 text-xs truncate max-w-[200px]">
                                                        CFI: {String(log.request_data.position).substring(0, 40)}...
                                                    </span>
                                                )}
                                                {log.error_message && (
                                                    <span className="text-red-400">
                                                        {log.error_message}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="p-8 text-center text-slate-500">
                            {t('No logs found')}
                        </div>
                    )}
                    <div ref={logsEndRef} />
                </div>
            </div>

            {/* Clear Modal */}
            <ConfirmModal
                isOpen={showClearModal}
                onClose={() => setShowClearModal(false)}
                onConfirm={handleClear}
                title={t('Clear old logs')}
                message={
                    <div className="space-y-4">
                        <p>{t('Delete logs older than:')}</p>
                        <select
                            value={daysToKeep}
                            onChange={(e) => setDaysToKeep(Number(e.target.value))}
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                        >
                            <option value={1}>{t('1 day')}</option>
                            <option value={3}>{t('3 days')}</option>
                            <option value={7}>{t('7 days')}</option>
                            <option value={14}>{t('14 days')}</option>
                            <option value={30}>{t('30 days')}</option>
                        </select>
                    </div>
                }
                confirmText={t('Delete')}
                cancelText={t('Cancel')}
                isLoading={clearMutation.isPending}
                variant="danger"
            />
        </div>
    );
}
