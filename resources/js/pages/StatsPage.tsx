import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useStats } from '@/api/hooks';
import { LoadingSpinner } from '@/components/ui';
import { BookIcon, ClockIcon, CheckCircleIcon } from '@/components/icons';

export function StatsPage() {
    const { t } = useTranslation();
    const { data: stats, isLoading } = useStats();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="text-center py-16">
                <p className="text-slate-400">{t('Failed to load stats')}</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <h1 className="text-2xl font-bold text-white">{t('Reading Statistics')}</h1>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-400 text-sm">{t('Total Books')}</p>
                            <p className="text-3xl font-bold text-white mt-1">{stats.total_books}</p>
                        </div>
                        <div className="p-3 bg-indigo-600/20 rounded-xl">
                            <BookIcon className="h-6 w-6 text-indigo-400" />
                        </div>
                    </div>
                </div>

                <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-400 text-sm">{t('Finished')}</p>
                            <p className="text-3xl font-bold text-white mt-1">{stats.books_finished}</p>
                        </div>
                        <div className="p-3 bg-emerald-600/20 rounded-xl">
                            <CheckCircleIcon className="h-6 w-6 text-emerald-400" />
                        </div>
                    </div>
                </div>

                <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-400 text-sm">{t('Reading Time')}</p>
                            <p className="text-3xl font-bold text-white mt-1">{stats.total_reading_time}</p>
                        </div>
                        <div className="p-3 bg-amber-600/20 rounded-xl">
                            <ClockIcon className="h-6 w-6 text-amber-400" />
                        </div>
                    </div>
                </div>

                <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-400 text-sm">{t('Sessions')}</p>
                            <p className="text-3xl font-bold text-white mt-1">{stats.total_sessions}</p>
                        </div>
                        <div className="p-3 bg-purple-600/20 rounded-xl">
                            <ClockIcon className="h-6 w-6 text-purple-400" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Book Status Breakdown */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
                <h2 className="text-lg font-semibold text-white mb-4">{t('Book Status')}</h2>
                <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-slate-700/50 rounded-lg">
                        <p className="text-2xl font-bold text-emerald-400">{stats.books_finished}</p>
                        <p className="text-sm text-slate-400 mt-1">{t('Finished')}</p>
                    </div>
                    <div className="text-center p-4 bg-slate-700/50 rounded-lg">
                        <p className="text-2xl font-bold text-amber-400">{stats.books_reading}</p>
                        <p className="text-sm text-slate-400 mt-1">{t('Reading')}</p>
                    </div>
                    <div className="text-center p-4 bg-slate-700/50 rounded-lg">
                        <p className="text-2xl font-bold text-slate-400">{stats.books_not_started}</p>
                        <p className="text-sm text-slate-400 mt-1">{t('Not Started')}</p>
                    </div>
                </div>
            </div>

            {/* Reading by Client */}
            {stats.reading_by_client.length > 0 && (
                <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
                    <h2 className="text-lg font-semibold text-white mb-4">{t('Reading by Device')}</h2>
                    <div className="space-y-3">
                        {stats.reading_by_client.map((client) => (
                            <div key={client.client} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                                <div>
                                    <p className="font-medium text-white">{client.label}</p>
                                    <p className="text-sm text-slate-400">{client.sessions} {t('sessions')}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-medium text-indigo-400">{client.hours}h</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Monthly Reading Chart */}
            {stats.reading_by_month.length > 0 && (
                <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
                    <h2 className="text-lg font-semibold text-white mb-4">{t('Reading History')}</h2>
                    <div className="flex items-end gap-2 h-48">
                        {stats.reading_by_month.map((month) => {
                            const maxHours = Math.max(...stats.reading_by_month.map(m => m.hours));
                            const height = maxHours > 0 ? (month.hours / maxHours) * 100 : 0;
                            return (
                                <div key={month.month} className="flex-1 flex flex-col items-center gap-2">
                                    <div className="w-full flex flex-col items-center justify-end h-36">
                                        <span className="text-xs text-slate-400 mb-1">{month.hours}h</span>
                                        <div
                                            className="w-full bg-indigo-600 rounded-t-md transition-all"
                                            style={{ height: `${Math.max(height, 4)}%` }}
                                        />
                                    </div>
                                    <span className="text-xs text-slate-500 rotate-45 origin-left">
                                        {month.month.slice(5)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Recent Sessions */}
            {stats.recent_sessions.length > 0 && (
                <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
                    <h2 className="text-lg font-semibold text-white mb-4">{t('Recent Sessions')}</h2>
                    <div className="space-y-3">
                        {stats.recent_sessions.map((session) => (
                            <Link
                                key={session.id}
                                to={`/books/${session.book.id}`}
                                className="flex items-center gap-4 p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors"
                            >
                                {session.book.cover_url ? (
                                    <img
                                        src={session.book.cover_url}
                                        alt={session.book.title}
                                        className="w-12 h-16 object-cover rounded"
                                    />
                                ) : (
                                    <div className="w-12 h-16 bg-slate-600 rounded flex items-center justify-center">
                                        <BookIcon className="h-6 w-6 text-slate-500" />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-white truncate">{session.book.title}</p>
                                    <p className="text-sm text-slate-400 truncate">{session.book.author}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-medium text-slate-300">{session.formatted_duration}</p>
                                    <p className="text-xs text-slate-500">
                                        {new Date(session.started_at).toLocaleDateString()}
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
