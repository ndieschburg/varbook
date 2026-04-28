import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useStats } from '@/api/hooks';
import { LoadingSpinner } from '@/components/ui';
import { BookIcon, ClockIcon, CheckCircleIcon, ChevronDownIcon, TrophyIcon } from '@/components/icons';

/**
 * Get date key for grouping sessions (YYYY-MM-DD format)
 */
function getDateKey(dateString: string): string {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
}

/**
 * Format duration in seconds to human-readable format
 */
function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
}

/**
 * Check if date is today
 */
function isToday(dateKey: string): boolean {
    const today = new Date().toISOString().split('T')[0];
    return dateKey === today;
}

/**
 * Check if date is yesterday
 */
function isYesterday(dateKey: string): boolean {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return dateKey === yesterday.toISOString().split('T')[0];
}

export function StatsPage() {
    const { t } = useTranslation();
    const { data: stats, isLoading } = useStats();
    const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

    const toggleDay = (dateKey: string) => {
        setExpandedDays((prev) => {
            const next = new Set(prev);
            if (next.has(dateKey)) {
                next.delete(dateKey);
            } else {
                next.add(dateKey);
            }
            return next;
        });
    };

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
                <p className="text-gray-500 dark:text-slate-400">{t('Failed to load stats')}</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('Reading Statistics')}</h1>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 dark:text-slate-400 text-sm">{t('Total Books')}</p>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.total_books}</p>
                        </div>
                        <div className="p-3 bg-indigo-600/20 rounded-xl">
                            <BookIcon className="h-6 w-6 text-indigo-400" />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 dark:text-slate-400 text-sm">{t('Finished')}</p>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.books_finished}</p>
                        </div>
                        <div className="p-3 bg-emerald-600/20 rounded-xl">
                            <CheckCircleIcon className="h-6 w-6 text-emerald-400" />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 dark:text-slate-400 text-sm">{t('Reading Time')}</p>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.total_reading_time}</p>
                        </div>
                        <div className="p-3 bg-amber-600/20 rounded-xl">
                            <ClockIcon className="h-6 w-6 text-amber-400" />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 dark:text-slate-400 text-sm">{t('Sessions')}</p>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.total_sessions}</p>
                        </div>
                        <div className="p-3 bg-purple-600/20 rounded-xl">
                            <ClockIcon className="h-6 w-6 text-purple-400" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Book Status Breakdown */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('Book Status')}</h2>
                <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-gray-100 dark:bg-slate-700/50 rounded-lg">
                        <p className="text-2xl font-bold text-emerald-500 dark:text-emerald-400">{stats.books_finished}</p>
                        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{t('Finished')}</p>
                    </div>
                    <div className="text-center p-4 bg-gray-100 dark:bg-slate-700/50 rounded-lg">
                        <p className="text-2xl font-bold text-amber-500 dark:text-amber-400">{stats.books_reading}</p>
                        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{t('Reading')}</p>
                    </div>
                    <div className="text-center p-4 bg-gray-100 dark:bg-slate-700/50 rounded-lg">
                        <p className="text-2xl font-bold text-gray-500 dark:text-slate-400">{stats.books_not_started}</p>
                        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{t('Not Started')}</p>
                    </div>
                </div>
            </div>

            {/* Reading by Client */}
            {stats.reading_by_client.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('Reading by Device')}</h2>
                    <div className="space-y-3">
                        {stats.reading_by_client.map((client) => (
                            <div key={client.client} className="flex items-center justify-between p-3 bg-gray-100 dark:bg-slate-700/50 rounded-lg">
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-white">{client.label}</p>
                                    <p className="text-sm text-gray-500 dark:text-slate-400">{client.sessions} {t('sessions')}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-medium text-indigo-600 dark:text-indigo-400">{client.hours}h</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Top Readers (Last 12 Months) - Heatmap */}
            {stats.top_readers.readers.length > 0 && (() => {
                const { months, readers } = stats.top_readers;
                const allHours = readers.flatMap(r => r.monthly_hours);
                const maxHours = Math.max(...allHours, 1);

                /**
                 * Get heatmap cell background based on hours value relative to max
                 */
                const getCellStyle = (hours: number) => {
                    if (hours === 0) return {};
                    const intensity = Math.min(hours / maxHours, 1);
                    const opacity = 0.15 + intensity * 0.85;
                    return { backgroundColor: `rgba(99, 102, 241, ${opacity})` };
                };

                return (
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
                        <div className="flex items-center gap-2 mb-5">
                            <TrophyIcon className="h-5 w-5 text-amber-500" />
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('Top Readers')}</h2>
                            <span className="text-sm text-gray-400 dark:text-slate-500">({t('Last 12 months')})</span>
                        </div>

                        <div className="overflow-x-auto -mx-6 px-6">
                            <table className="w-full min-w-[640px]">
                                <thead>
                                    <tr>
                                        <th className="text-left text-xs font-medium text-gray-500 dark:text-slate-400 pb-2 pr-3 w-32"></th>
                                        {months.map((month) => (
                                            <th key={month} className="text-center text-xs font-medium text-gray-400 dark:text-slate-500 pb-2 px-0.5">
                                                {month.slice(5)}
                                            </th>
                                        ))}
                                        <th className="text-right text-xs font-medium text-gray-500 dark:text-slate-400 pb-2 pl-3">{t('Total')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {readers.map((reader, index) => {
                                        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : null;

                                        return (
                                            <tr key={reader.name}>
                                                <td className="py-1.5 pr-3">
                                                    <div className="flex items-center gap-2">
                                                        {medal ? (
                                                            <span className="text-sm">{medal}</span>
                                                        ) : (
                                                            <span className="text-xs text-gray-400 dark:text-slate-500 w-5 text-center">{index + 1}</span>
                                                        )}
                                                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                            {reader.name}
                                                        </span>
                                                    </div>
                                                </td>
                                                {reader.monthly_hours.map((hours, i) => (
                                                    <td key={months[i]} className="py-1.5 px-0.5">
                                                        <div
                                                            className={`rounded h-8 flex items-center justify-center text-xs tabular-nums transition-colors ${
                                                                hours > 0
                                                                    ? 'text-white font-medium'
                                                                    : 'bg-gray-50 dark:bg-slate-700/30 text-gray-300 dark:text-slate-600'
                                                            }`}
                                                            style={getCellStyle(hours)}
                                                            title={`${reader.name} — ${months[i]}: ${hours}h`}
                                                        >
                                                            {hours > 0 ? `${hours}` : ''}
                                                        </div>
                                                    </td>
                                                ))}
                                                <td className="py-1.5 pl-3 text-right">
                                                    <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 tabular-nums">
                                                        {reader.total_hours}h
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Line Chart */}
                        {(() => {
                            const chartW = 800;
                            const chartH = 240;
                            const padL = 40;
                            const padR = 16;
                            const padT = 16;
                            const padB = 32;
                            const innerW = chartW - padL - padR;
                            const innerH = chartH - padT - padB;
                            const chartMax = Math.max(...readers.flatMap(r => r.monthly_hours), 1);
                            const stepCount = 4;

                            const lineColors = [
                                '#6366f1', // indigo
                                '#f59e0b', // amber
                                '#10b981', // emerald
                                '#ef4444', // red
                                '#8b5cf6', // violet
                            ];

                            const x = (i: number) => padL + (i / (months.length - 1)) * innerW;
                            const y = (val: number) => padT + innerH - (val / chartMax) * innerH;

                            return (
                                <div className="mt-6 overflow-x-auto -mx-6 px-6">
                                    <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full min-w-[500px]" preserveAspectRatio="xMidYMid meet">
                                        {/* Horizontal grid lines + Y labels */}
                                        {Array.from({ length: stepCount + 1 }, (_, i) => {
                                            const val = (chartMax / stepCount) * i;
                                            const yPos = y(val);
                                            return (
                                                <g key={i}>
                                                    <line x1={padL} x2={chartW - padR} y1={yPos} y2={yPos} stroke="currentColor" className="text-gray-200 dark:text-slate-700" strokeWidth="1" />
                                                    <text x={padL - 6} y={yPos + 4} textAnchor="end" className="fill-gray-400 dark:fill-slate-500" fontSize="10">
                                                        {Math.round(val)}h
                                                    </text>
                                                </g>
                                            );
                                        })}

                                        {/* X labels (months) */}
                                        {months.map((month, i) => (
                                            <text key={month} x={x(i)} y={chartH - 6} textAnchor="middle" className="fill-gray-400 dark:fill-slate-500" fontSize="10">
                                                {month.slice(5)}
                                            </text>
                                        ))}

                                        {/* Lines + dots per reader */}
                                        {readers.map((reader, ri) => {
                                            const color = lineColors[ri % lineColors.length];
                                            const points = reader.monthly_hours.map((h, i) => `${x(i)},${y(h)}`).join(' ');

                                            return (
                                                <g key={reader.name}>
                                                    <polyline
                                                        points={points}
                                                        fill="none"
                                                        stroke={color}
                                                        strokeWidth="2.5"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    />
                                                    {reader.monthly_hours.map((h, i) => (
                                                        <circle key={i} cx={x(i)} cy={y(h)} r="3.5" fill={color} stroke="white" strokeWidth="1.5">
                                                            <title>{`${reader.name}: ${h}h`}</title>
                                                        </circle>
                                                    ))}
                                                </g>
                                            );
                                        })}
                                    </svg>

                                    {/* Legend */}
                                    <div className="flex flex-wrap gap-4 mt-3 justify-center">
                                        {readers.map((reader, ri) => (
                                            <div key={reader.name} className="flex items-center gap-1.5">
                                                <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: lineColors[ri % lineColors.length] }} />
                                                <span className="text-xs text-gray-600 dark:text-slate-400">{reader.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                );
            })()}

            {/* Monthly Reading Chart */}
            {stats.reading_by_month.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('Reading History')}</h2>
                    <div className="flex items-end gap-2 h-48">
                        {stats.reading_by_month.map((month) => {
                            const maxHours = Math.max(...stats.reading_by_month.map(m => m.hours));
                            const height = maxHours > 0 ? (month.hours / maxHours) * 100 : 0;
                            return (
                                <div key={month.month} className="flex-1 flex flex-col items-center gap-2">
                                    <div className="w-full flex flex-col items-center justify-end h-36">
                                        <span className="text-xs text-gray-500 dark:text-slate-400 mb-1">{month.hours}h</span>
                                        <div
                                            className="w-full bg-indigo-600 rounded-t-md transition-all"
                                            style={{ height: `${Math.max(height, 4)}%` }}
                                        />
                                    </div>
                                    <span className="text-xs text-gray-400 dark:text-slate-500 rotate-45 origin-left">
                                        {month.month.slice(5)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Recent Sessions - Grouped by Day */}
            {stats.recent_sessions.length > 0 && (() => {
                // Filter out 0-duration sessions and group by day
                const filteredSessions = stats.recent_sessions.filter((s) => s.duration_seconds > 0);

                if (filteredSessions.length === 0) return null;

                const groupedSessions = filteredSessions.reduce((acc, session) => {
                    const dateKey = getDateKey(session.started_at);
                    if (!acc[dateKey]) {
                        acc[dateKey] = [];
                    }
                    acc[dateKey].push(session);
                    return acc;
                }, {} as Record<string, typeof filteredSessions>);

                // Sort days (most recent first)
                const sortedDays = Object.keys(groupedSessions).sort((a, b) => b.localeCompare(a));

                return (
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('Recent Sessions')}</h2>
                        <div className="space-y-4">
                            {sortedDays.map((dateKey) => {
                                const daySessions = groupedSessions[dateKey];
                                const totalSeconds = daySessions.reduce((sum, s) => sum + s.duration_seconds, 0);

                                // Format day label
                                let dayLabel: string;
                                if (isToday(dateKey)) {
                                    dayLabel = t('Today');
                                } else if (isYesterday(dateKey)) {
                                    dayLabel = t('Yesterday');
                                } else {
                                    dayLabel = new Date(dateKey + 'T00:00:00').toLocaleDateString(undefined, {
                                        weekday: 'long',
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric',
                                    });
                                }

                                const isExpanded = expandedDays.has(dateKey);

                                return (
                                    <div key={dateKey} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
                                        {/* Day Header - Clickable */}
                                        <button
                                            onClick={() => toggleDay(dateKey)}
                                            className="w-full px-6 py-3 bg-gray-50 dark:bg-slate-700/50 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                                        >
                                            <div className="flex items-center gap-2">
                                                <ChevronDownIcon
                                                    className={`h-5 w-5 text-gray-500 dark:text-slate-400 transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
                                                />
                                                <span className="font-medium text-gray-900 dark:text-slate-100 capitalize">
                                                    {dayLabel}
                                                </span>
                                                <span className="text-sm text-gray-500 dark:text-slate-400">
                                                    ({daySessions.length})
                                                </span>
                                            </div>
                                            <span className="text-sm text-gray-500 dark:text-slate-400 flex items-center gap-1">
                                                <ClockIcon className="h-4 w-4" />
                                                {formatDuration(totalSeconds)}
                                            </span>
                                        </button>

                                        {/* Sessions - Collapsible */}
                                        {isExpanded && (
                                            <div className="border-t border-gray-200 dark:border-slate-700 divide-y divide-gray-200 dark:divide-slate-700">
                                                {daySessions.map((session) => (
                                                    <Link
                                                        key={session.id}
                                                        to={`/books/${session.book.id}`}
                                                        className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                                                    >
                                                        {session.book.cover_url ? (
                                                            <img
                                                                src={session.book.cover_url}
                                                                alt={session.book.title}
                                                                className="w-10 h-14 object-cover rounded"
                                                            />
                                                        ) : (
                                                            <div className="w-10 h-14 bg-gray-200 dark:bg-slate-600 rounded flex items-center justify-center">
                                                                <BookIcon className="h-5 w-5 text-gray-400 dark:text-slate-500" />
                                                            </div>
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-medium text-gray-900 dark:text-white truncate">{session.book.title}</p>
                                                            <p className="text-sm text-gray-500 dark:text-slate-400 truncate">{session.book.author}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-sm font-medium text-gray-700 dark:text-slate-300">{session.formatted_duration}</p>
                                                            <p className="text-xs text-gray-400 dark:text-slate-500">
                                                                {new Date(session.started_at).toLocaleTimeString(undefined, {
                                                                    hour: '2-digit',
                                                                    minute: '2-digit',
                                                                })}
                                                            </p>
                                                        </div>
                                                    </Link>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
