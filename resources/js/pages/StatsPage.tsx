import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useStats } from '@/api/hooks';
import { LoadingSpinner } from '@/components/ui';
import { BookIcon, ClockIcon, CheckCircleIcon, ChevronDownIcon, TrophyIcon, DevicesIcon, BookOpenIcon } from '@/components/icons';
import type { ReadingHoursByDayData } from '@/types';

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

function isToday(dateKey: string): boolean {
    return dateKey === new Date().toISOString().split('T')[0];
}

function isYesterday(dateKey: string): boolean {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return dateKey === yesterday.toISOString().split('T')[0];
}

/**
 * KPI stat card with gradient icon
 */
function KpiCard({ label, value, icon, gradient, shadowColor }: {
    label: string;
    value: string | number;
    icon: React.ReactNode;
    gradient: string;
    shadowColor: string;
}) {
    return (
        <div className="bg-gradient-to-br from-white to-gray-50/50 dark:from-slate-800 dark:to-slate-800/50 rounded-2xl border border-gray-200/60 dark:border-slate-700/60 p-5 transition-all hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-slate-900/50">
            <div className="flex items-center gap-4">
                <div className={`flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} shadow-lg ${shadowColor}`}>
                    {icon}
                </div>
                <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-400 dark:text-slate-500 uppercase tracking-wider">{label}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5 tabular-nums">{value}</p>
                </div>
            </div>
        </div>
    );
}

const CHART_COLORS: Record<string, string> = {
    total: '#f59e0b',
    web: '#6366f1',
    koreader: '#10b981',
    moon: '#ef4444',
};

/**
 * Format a YYYY-MM-DD date string to DD/MM for readable X-axis labels
 */
function formatDateLabel(dateStr: string): string {
    const parts = dateStr.split('-');
    return `${parts[2]}/${parts[1]}`;
}

/**
 * Bar chart showing daily reading hours per device, stacked
 */
function ReadingHoursChart({ data }: { data: ReadingHoursByDayData }) {
    const { t } = useTranslation();
    const { clients, days } = data;

    const chartW = 800;
    const chartH = 240;
    const padL = 40;
    const padR = 12;
    const padT = 12;
    const padB = 36;
    const innerW = chartW - padL - padR;
    const innerH = chartH - padT - padB;

    const maxDayHours = Math.max(...days.map(d => d.day_hours), 0.1);

    const x = (i: number) => padL + (i / Math.max(days.length - 1, 1)) * innerW;
    const y = (val: number) => padT + innerH - (val / maxDayHours) * innerH;

    const stepCount = 4;
    const ySteps = Array.from({ length: stepCount + 1 }, (_, i) => (maxDayHours / stepCount) * i);

    const labelCount = Math.min(10, days.length);
    const labelIndices = days.length > 1
        ? Array.from({ length: labelCount }, (_, i) => Math.round((i / (labelCount - 1)) * (days.length - 1)))
        : [0];

    const currentTotal = days[days.length - 1]?.total ?? 0;

    const barW = Math.max(innerW / days.length * 0.7, 1.5);

    // Compute per-client daily hours (non-cumulative) from the cumulative data
    const clientDailyHours = (dayIndex: number, clientKey: string): number => {
        const current = days[dayIndex]?.clients[clientKey] ?? 0;
        const prev = dayIndex > 0 ? (days[dayIndex - 1]?.clients[clientKey] ?? 0) : 0;
        return Math.max(round1(current - prev), 0);
    };

    function round1(n: number) { return Math.round(n * 10) / 10; }

    // Legend: total hours (cumulative) + per client total
    const clientTotals = clients.map(c => {
        const lastVal = days[days.length - 1]?.clients[c.key] ?? 0;
        return { key: c.key, label: c.label, color: CHART_COLORS[c.key] ?? '#8b5cf6', value: lastVal };
    });

    return (
        <div className="group bg-gradient-to-br from-white to-gray-50/50 dark:from-slate-800 dark:to-slate-800/50 rounded-2xl border border-gray-200/60 dark:border-slate-700/60 p-5 transition-all hover:border-gray-300 dark:hover:border-slate-600 hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-slate-900/50">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 shadow-md shadow-amber-500/20">
                        <ClockIcon className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{t('Reading Journey')}</h2>
                        <p className="text-[11px] text-gray-400 dark:text-slate-500 font-mono">
                            {formatDateLabel(days[0].date)} — {formatDateLabel(days[days.length - 1].date)}
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <span className="text-xl font-bold text-amber-500 tabular-nums">{currentTotal}h</span>
                    <p className="text-[11px] text-gray-400 dark:text-slate-500">{t('Total')}</p>
                </div>
            </div>

            <div className="overflow-x-auto -mx-5 px-5">
                <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full min-w-[400px]" preserveAspectRatio="xMidYMid meet">
                    {/* Grid */}
                    {ySteps.map((val, i) => {
                        const yPos = y(val);
                        return (
                            <g key={i}>
                                <line x1={padL} x2={chartW - padR} y1={yPos} y2={yPos} stroke="currentColor" className="text-gray-100 dark:text-slate-700/50" strokeWidth="1" strokeDasharray={i === 0 ? undefined : '4 4'} />
                                <text x={padL - 8} y={yPos + 4} textAnchor="end" className="fill-gray-300 dark:fill-slate-600" fontSize="9" fontFamily="ui-monospace, monospace">
                                    {round1(val)}h
                                </text>
                            </g>
                        );
                    })}

                    {/* Stacked bars per day */}
                    {days.map((d, i) => {
                        if (d.day_hours === 0) return null;

                        // Stack client bars
                        let stackY = y(0);
                        const segments: { key: string; color: string; height: number; hours: number; yStart: number }[] = [];

                        for (const c of clients) {
                            const h = clientDailyHours(i, c.key);
                            if (h <= 0) continue;
                            const barHeight = (h / maxDayHours) * innerH;
                            stackY -= barHeight;
                            segments.push({
                                key: c.key,
                                color: CHART_COLORS[c.key] ?? '#8b5cf6',
                                height: barHeight,
                                hours: h,
                                yStart: stackY,
                            });
                        }

                        // Build tooltip
                        const parts = segments.map(s => `${clients.find(c => c.key === s.key)?.label}: ${s.hours}h`).join(' | ');
                        const tooltip = `${formatDateLabel(d.date)} — ${d.day_hours}h${parts ? `\n${parts}` : ''}`;

                        return (
                            <g key={`bar-${i}`}>
                                {segments.length > 0 ? (
                                    segments.map((seg, si) => (
                                        <rect
                                            key={seg.key}
                                            x={x(i) - barW / 2}
                                            y={seg.yStart}
                                            width={barW}
                                            height={seg.height}
                                            rx={si === segments.length - 1 ? Math.min(barW / 2, 2) : 0}
                                            fill={seg.color}
                                            opacity="0.7"
                                            className="group-hover:opacity-90 transition-opacity"
                                        >
                                            <title>{tooltip}</title>
                                        </rect>
                                    ))
                                ) : (
                                    <rect
                                        x={x(i) - barW / 2}
                                        y={y(d.day_hours)}
                                        width={barW}
                                        height={(d.day_hours / maxDayHours) * innerH}
                                        rx={Math.min(barW / 2, 2)}
                                        fill={CHART_COLORS.total}
                                        opacity="0.5"
                                        className="group-hover:opacity-80 transition-opacity"
                                    >
                                        <title>{tooltip}</title>
                                    </rect>
                                )}
                            </g>
                        );
                    })}

                    {/* X labels - DD/MM format */}
                    {labelIndices.map((idx) => (
                        <text key={idx} x={x(idx)} y={chartH - 4} textAnchor="middle" className="fill-gray-400 dark:fill-slate-500" fontSize="9" fontFamily="ui-monospace, monospace">
                            {formatDateLabel(days[idx].date)}
                        </text>
                    ))}
                </svg>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 justify-center">
                {clientTotals.map(entry => (
                    <div key={entry.key} className="flex items-center gap-1.5">
                        <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="text-[11px] text-gray-500 dark:text-slate-400 font-medium">{entry.label}</span>
                        <span className="text-[11px] font-bold tabular-nums" style={{ color: entry.color }}>{entry.value}h</span>
                    </div>
                ))}
            </div>
        </div>
    );
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

    const totalBooks = stats.total_books;
    const bookStatusData = [
        { count: stats.books_finished, label: t('Finished'), color: 'from-emerald-500 to-teal-600', textColor: 'text-emerald-500 dark:text-emerald-400' },
        { count: stats.books_reading, label: t('Reading'), color: 'from-amber-500 to-orange-600', textColor: 'text-amber-500 dark:text-amber-400' },
        { count: stats.books_not_started, label: t('Not Started'), color: 'from-gray-400 to-gray-500', textColor: 'text-gray-400 dark:text-slate-500' },
    ];

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-purple-600 shadow-lg shadow-accent/20">
                    <BookOpenIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t('Reading Statistics')}</h1>
                    <p className="text-xs text-gray-500 dark:text-slate-400">{t('Your reading activity at a glance')}</p>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                    label={t('Total Books')}
                    value={stats.total_books}
                    icon={<BookIcon className="w-5 h-5 text-white" />}
                    gradient="from-indigo-500 to-blue-600"
                    shadowColor="shadow-indigo-500/20"
                />
                <KpiCard
                    label={t('Finished')}
                    value={stats.books_finished}
                    icon={<CheckCircleIcon className="w-5 h-5 text-white" />}
                    gradient="from-emerald-500 to-teal-600"
                    shadowColor="shadow-emerald-500/20"
                />
                <KpiCard
                    label={t('Reading Time')}
                    value={stats.total_reading_time}
                    icon={<ClockIcon className="w-5 h-5 text-white" />}
                    gradient="from-amber-500 to-orange-600"
                    shadowColor="shadow-amber-500/20"
                />
                <KpiCard
                    label={t('Sessions')}
                    value={stats.total_sessions}
                    icon={<DevicesIcon className="w-5 h-5 text-white" />}
                    gradient="from-violet-500 to-purple-600"
                    shadowColor="shadow-violet-500/20"
                />
            </div>

            {/* Monthly Rank */}
            {stats.monthly_rank !== null && (
                <div className="bg-gradient-to-br from-white to-gray-50/50 dark:from-slate-800 dark:to-slate-800/50 rounded-2xl border border-gray-200/60 dark:border-slate-700/60 p-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/20">
                                <TrophyIcon className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-gray-400 dark:text-slate-500 uppercase tracking-wider">{t('Monthly Rank')}</p>
                                <div className="flex items-baseline gap-1.5 mt-0.5">
                                    <span className="text-3xl font-bold text-gray-900 dark:text-white tabular-nums">
                                        #{stats.monthly_rank}
                                    </span>
                                    <span className="text-sm text-gray-400 dark:text-slate-500">
                                        / {stats.monthly_rank_total}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-lg font-bold text-amber-500 tabular-nums">{stats.monthly_rank_hours}h</p>
                            <p className="text-[11px] text-gray-400 dark:text-slate-500">{t('This month')}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Book Status Breakdown */}
            <div className="bg-gradient-to-br from-white to-gray-50/50 dark:from-slate-800 dark:to-slate-800/50 rounded-2xl border border-gray-200/60 dark:border-slate-700/60 p-5">
                <div className="flex items-center gap-2.5 mb-4">
                    <div className="p-1.5 rounded-lg bg-indigo-500/10">
                        <BookIcon className="h-4 w-4 text-indigo-500" />
                    </div>
                    <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300">{t('Book Status')}</h2>
                </div>

                {/* Progress bar */}
                {totalBooks > 0 && (
                    <div className="flex h-2.5 rounded-full overflow-hidden mb-4 bg-gray-100 dark:bg-slate-700">
                        {bookStatusData.map((s) => {
                            const pct = (s.count / totalBooks) * 100;
                            if (pct === 0) return null;
                            return (
                                <div
                                    key={s.label}
                                    className={`h-full bg-gradient-to-r ${s.color} transition-all duration-500`}
                                    style={{ width: `${pct}%` }}
                                    title={`${s.label}: ${s.count} (${Math.round(pct)}%)`}
                                />
                            );
                        })}
                    </div>
                )}

                <div className="grid grid-cols-3 gap-3">
                    {bookStatusData.map((s) => (
                        <div key={s.label} className="text-center p-3 rounded-xl bg-gray-50 dark:bg-slate-700/30">
                            <p className={`text-xl font-bold tabular-nums ${s.textColor}`}>{s.count}</p>
                            <p className="text-[11px] font-medium text-gray-400 dark:text-slate-500 mt-0.5 uppercase tracking-wider">{s.label}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Reading by Client */}
            {stats.reading_by_client.length > 0 && (
                <div className="bg-gradient-to-br from-white to-gray-50/50 dark:from-slate-800 dark:to-slate-800/50 rounded-2xl border border-gray-200/60 dark:border-slate-700/60 p-5">
                    <div className="flex items-center gap-2.5 mb-4">
                        <div className="p-1.5 rounded-lg bg-violet-500/10">
                            <DevicesIcon className="h-4 w-4 text-violet-500" />
                        </div>
                        <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300">{t('Reading by Device')}</h2>
                    </div>
                    <div className="space-y-2">
                        {(() => {
                            const maxClientHours = Math.max(...stats.reading_by_client.map(c => c.hours), 1);
                            const clientColors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

                            return stats.reading_by_client.map((client, i) => {
                                const barPct = Math.max((client.hours / maxClientHours) * 100, 2);
                                const color = clientColors[i % clientColors.length];

                                return (
                                    <div key={client.client} className="group flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700/20 transition-colors">
                                        <div className="w-2 h-8 rounded-full" style={{ backgroundColor: color }} />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-baseline justify-between mb-1.5">
                                                <span className="text-sm font-medium text-gray-900 dark:text-white">{client.label}</span>
                                                <span className="text-sm font-bold tabular-nums" style={{ color }}>{client.hours}h</span>
                                            </div>
                                            <div className="h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-500"
                                                    style={{ width: `${barPct}%`, backgroundColor: color }}
                                                />
                                            </div>
                                            <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1 tabular-nums">{client.sessions} {t('sessions')}</p>
                                        </div>
                                    </div>
                                );
                            });
                        })()}
                    </div>
                </div>
            )}

            {/* Cumulative Reading Hours Chart */}
            {stats.reading_hours_by_day?.days?.length > 1 && (
                <ReadingHoursChart data={stats.reading_hours_by_day} />
            )}


            {/* Monthly Reading Chart */}
            {stats.reading_by_month.length > 0 && (() => {
                const maxHours = Math.max(...stats.reading_by_month.map(m => m.hours), 1);

                return (
                    <div className="bg-gradient-to-br from-white to-gray-50/50 dark:from-slate-800 dark:to-slate-800/50 rounded-2xl border border-gray-200/60 dark:border-slate-700/60 p-5">
                        <div className="flex items-center gap-2.5 mb-4">
                            <div className="p-1.5 rounded-lg bg-amber-500/10">
                                <ClockIcon className="h-4 w-4 text-amber-500" />
                            </div>
                            <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300">{t('Reading History')}</h2>
                        </div>
                        <div className="flex items-end gap-1.5 h-44">
                            {stats.reading_by_month.map((month) => {
                                const height = maxHours > 0 ? (month.hours / maxHours) * 100 : 0;
                                const isCurrentMonth = month.month === new Date().toISOString().slice(0, 7);

                                return (
                                    <div key={month.month} className="group flex-1 flex flex-col items-center gap-1" title={`${month.month}: ${month.hours}h`}>
                                        <div className="w-full flex flex-col items-center justify-end h-32">
                                            <span className="text-[10px] text-gray-400 dark:text-slate-500 mb-1 opacity-0 group-hover:opacity-100 transition-opacity tabular-nums font-mono">
                                                {month.hours}h
                                            </span>
                                            <div
                                                className={`w-full rounded-t-md transition-all duration-500 ${
                                                    isCurrentMonth
                                                        ? 'bg-gradient-to-t from-indigo-600 to-indigo-400'
                                                        : 'bg-gradient-to-t from-indigo-600/60 to-indigo-400/40 group-hover:from-indigo-600/80 group-hover:to-indigo-400/60'
                                                }`}
                                                style={{ height: `${Math.max(height, 3)}%` }}
                                            />
                                        </div>
                                        <span className={`text-[10px] font-mono ${isCurrentMonth ? 'text-indigo-500 font-semibold' : 'text-gray-300 dark:text-slate-600'}`}>
                                            {month.month.slice(5)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })()}

            {/* Recent Sessions - Grouped by Day */}
            {stats.recent_sessions.length > 0 && (() => {
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

                const sortedDays = Object.keys(groupedSessions).sort((a, b) => b.localeCompare(a));

                return (
                    <div>
                        <div className="flex items-center gap-2.5 mb-4">
                            <div className="p-1.5 rounded-lg bg-emerald-500/10">
                                <ClockIcon className="h-4 w-4 text-emerald-500" />
                            </div>
                            <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300">{t('Recent Sessions')}</h2>
                        </div>
                        <div className="space-y-3">
                            {sortedDays.map((dateKey) => {
                                const daySessions = groupedSessions[dateKey];
                                const totalSeconds = daySessions.reduce((sum, s) => sum + s.duration_seconds, 0);

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
                                    <div key={dateKey} className="bg-gradient-to-br from-white to-gray-50/50 dark:from-slate-800 dark:to-slate-800/50 rounded-2xl border border-gray-200/60 dark:border-slate-700/60 overflow-hidden transition-all hover:border-gray-300 dark:hover:border-slate-600">
                                        <button
                                            onClick={() => toggleDay(dateKey)}
                                            className="w-full px-5 py-3 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-slate-700/20 transition-colors cursor-pointer"
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <ChevronDownIcon
                                                    className={`h-4 w-4 text-gray-400 dark:text-slate-500 transition-transform duration-200 ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
                                                />
                                                <span className="text-sm font-medium text-gray-900 dark:text-slate-100 capitalize">
                                                    {dayLabel}
                                                </span>
                                                <span className="text-xs text-gray-300 dark:text-slate-600 tabular-nums">
                                                    {daySessions.length}
                                                </span>
                                            </div>
                                            <span className="text-xs font-semibold text-accent tabular-nums flex items-center gap-1.5">
                                                <ClockIcon className="h-3.5 w-3.5" />
                                                {formatDuration(totalSeconds)}
                                            </span>
                                        </button>

                                        {isExpanded && (
                                            <div className="border-t border-gray-100 dark:border-slate-700/30">
                                                {daySessions.map((session, i) => (
                                                    <Link
                                                        key={session.id}
                                                        to={`/books/${session.book.id}`}
                                                        className={`flex items-center gap-4 px-5 py-3 hover:bg-gray-50/50 dark:hover:bg-slate-700/20 transition-colors ${
                                                            i > 0 ? 'border-t border-gray-50 dark:border-slate-700/20' : ''
                                                        }`}
                                                    >
                                                        {session.book.cover_url ? (
                                                            <img
                                                                src={session.book.cover_url}
                                                                alt={session.book.title}
                                                                className="w-9 h-13 object-cover rounded-md shadow-sm"
                                                            />
                                                        ) : (
                                                            <div className="w-9 h-13 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-slate-700 dark:to-slate-600 rounded-md flex items-center justify-center">
                                                                <BookIcon className="h-4 w-4 text-gray-400 dark:text-slate-500" />
                                                            </div>
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{session.book.title}</p>
                                                            <p className="text-xs text-gray-400 dark:text-slate-500 truncate">{session.book.author}</p>
                                                        </div>
                                                        <div className="text-right flex-shrink-0">
                                                            <p className="text-sm font-semibold text-gray-700 dark:text-slate-300 tabular-nums">{session.formatted_duration}</p>
                                                            <p className="text-[11px] text-gray-300 dark:text-slate-600 font-mono">
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
