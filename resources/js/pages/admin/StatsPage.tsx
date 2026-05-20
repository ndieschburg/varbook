import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAdminActivityStats } from '@/api/hooks';
import { LoadingSpinner } from '@/components/ui';
import { UserIcon, ClockIcon, BookIcon, TrophyIcon } from '@/components/icons';
import type { AdminBooksByDay } from '@/types';

type PresetKey = 'this_week' | 'this_month' | 'this_year' | 'all' | 'custom';

interface DateRange {
    start_date?: string;
    end_date?: string;
}

/**
 * Compute start/end dates for a given preset
 */
function getPresetRange(preset: PresetKey, earliestDate?: string | null): DateRange {
    const now = new Date();
    const fmt = (d: Date) => d.toISOString().split('T')[0];

    switch (preset) {
        case 'this_week': {
            const day = now.getDay();
            const diff = day === 0 ? 6 : day - 1;
            const monday = new Date(now);
            monday.setDate(now.getDate() - diff);
            return { start_date: fmt(monday), end_date: fmt(now) };
        }
        case 'this_month': {
            const start = new Date(now.getFullYear(), now.getMonth(), 1);
            return { start_date: fmt(start), end_date: fmt(now) };
        }
        case 'this_year': {
            const start = new Date(now.getFullYear(), 0, 1);
            return { start_date: fmt(start), end_date: fmt(now) };
        }
        case 'all':
            return { start_date: earliestDate ?? undefined, end_date: fmt(now) };
        default:
            return {};
    }
}

interface DailyChartProps {
    data: AdminBooksByDay[];
    title: string;
    color: string;
    gradientId: string;
    icon: React.ReactNode;
    tooltipLabel: string;
}

/**
 * Reusable SVG area+line chart for daily cumulative data
 *
 * @description Renders a smooth area chart with gradient fill, grid lines,
 * and interactive tooltip dots. Adapts to any date range.
 */
function DailyChart({ data, title, color, gradientId, icon, tooltipLabel }: DailyChartProps) {
    const chartW = 800;
    const chartH = 220;
    const padL = 48;
    const padR = 12;
    const padT = 12;
    const padB = 36;
    const innerW = chartW - padL - padR;
    const innerH = chartH - padT - padB;

    const totals = data.map(d => d.total);
    const minVal = Math.min(...totals);
    const maxVal = Math.max(...totals);
    const range = maxVal - minVal || 1;

    const x = (i: number) => padL + (i / Math.max(data.length - 1, 1)) * innerW;
    const y = (val: number) => padT + innerH - ((val - minVal) / range) * innerH;

    // Build smooth curve path (cardinal spline approximation)
    const buildPath = () => {
        if (data.length < 2) return `M ${x(0)},${y(data[0].total)}`;
        const pts = data.map((d, i) => ({ x: x(i), y: y(d.total) }));
        let path = `M ${pts[0].x},${pts[0].y}`;
        for (let i = 0; i < pts.length - 1; i++) {
            const cp1x = pts[i].x + (pts[i + 1].x - pts[i].x) / 3;
            const cp2x = pts[i].x + 2 * (pts[i + 1].x - pts[i].x) / 3;
            path += ` C ${cp1x},${pts[i].y} ${cp2x},${pts[i + 1].y} ${pts[i + 1].x},${pts[i + 1].y}`;
        }
        return path;
    };

    const linePath = buildPath();
    const areaPath = `${linePath} L ${x(data.length - 1)},${y(minVal)} L ${x(0)},${y(minVal)} Z`;

    const stepCount = 4;
    const ySteps = Array.from({ length: stepCount + 1 }, (_, i) => minVal + (range / stepCount) * i);

    const labelCount = Math.min(6, data.length);
    const labelIndices = data.length > 1
        ? Array.from({ length: labelCount }, (_, i) => Math.round((i / (labelCount - 1)) * (data.length - 1)))
        : [0];

    // Current value (last data point)
    const currentValue = data[data.length - 1]?.total ?? 0;
    const displayValue = Number.isInteger(currentValue) ? currentValue : currentValue.toFixed(1);

    return (
        <div className="group bg-gradient-to-br from-white to-gray-50/50 dark:from-slate-800 dark:to-slate-800/50 rounded-2xl border border-gray-200/60 dark:border-slate-700/60 p-5 transition-all hover:border-gray-300 dark:hover:border-slate-600 hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-slate-900/50">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${color}15` }}>
                        {icon}
                    </div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300">{title}</h3>
                </div>
                <span className="text-xl font-bold tabular-nums" style={{ color }}>
                    {displayValue}
                </span>
            </div>
            <div className="overflow-x-auto -mx-5 px-5">
                <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full min-w-[360px]" preserveAspectRatio="xMidYMid meet">
                    {/* Grid lines */}
                    {ySteps.map((val, i) => {
                        const yPos = y(val);
                        return (
                            <g key={i}>
                                <line x1={padL} x2={chartW - padR} y1={yPos} y2={yPos} stroke="currentColor" className="text-gray-100 dark:text-slate-700/50" strokeWidth="1" strokeDasharray={i === 0 ? undefined : '4 4'} />
                                <text x={padL - 8} y={yPos + 4} textAnchor="end" className="fill-gray-300 dark:fill-slate-600" fontSize="9" fontFamily="ui-monospace, monospace">
                                    {Math.round(val)}
                                </text>
                            </g>
                        );
                    })}

                    {/* X labels */}
                    {labelIndices.map((idx) => (
                        <text key={idx} x={x(idx)} y={chartH - 4} textAnchor="middle" className="fill-gray-300 dark:fill-slate-600" fontSize="9" fontFamily="ui-monospace, monospace">
                            {data[idx].date.slice(5)}
                        </text>
                    ))}

                    {/* Area fill */}
                    <path d={areaPath} fill={`url(#${gradientId})`} />
                    <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
                            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
                        </linearGradient>
                    </defs>

                    {/* Line */}
                    <path
                        d={linePath}
                        fill="none"
                        stroke={color}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />

                    {/* Dots (only on few points to keep it clean) */}
                    {data.length <= 31 && data.map((d, i) => (
                        <circle key={i} cx={x(i)} cy={y(d.total)} r="2.5" fill={color} stroke="white" strokeWidth="1.5" className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <title>{`${d.date}: ${d.total} ${tooltipLabel}`}</title>
                        </circle>
                    ))}

                    {/* Last point always visible */}
                    <circle cx={x(data.length - 1)} cy={y(data[data.length - 1].total)} r="4" fill="white" stroke={color} strokeWidth="2.5" />
                </svg>
            </div>
        </div>
    );
}

/**
 * KPI stat card with gradient icon background and colored accent
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
                <div className={`flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} shadow-lg ${shadowColor}`}>
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

/**
 * Admin stats dashboard with date range filtering, KPIs, charts, and user activity table
 */
export function AdminStatsPage() {
    const { t } = useTranslation();
    const [activePreset, setActivePreset] = useState<PresetKey>('this_month');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    const initialQuery = useAdminActivityStats();
    const earliestDate = initialQuery.data?.earliest_date;

    const dateRange = useMemo<DateRange>(() => {
        if (activePreset === 'custom') {
            return {
                start_date: customStart || undefined,
                end_date: customEnd || undefined,
            };
        }
        return getPresetRange(activePreset, earliestDate);
    }, [activePreset, customStart, customEnd, earliestDate]);

    const { data: stats, isLoading, isFetching } = useAdminActivityStats(dateRange);

    const presets: { key: PresetKey; label: string }[] = [
        { key: 'this_week', label: t('This week') },
        { key: 'this_month', label: t('This month') },
        { key: 'this_year', label: t('This year') },
        { key: 'all', label: t('All time') },
        { key: 'custom', label: t('Custom') },
    ];

    const handlePreset = (key: PresetKey) => {
        setActivePreset(key);
        if (key !== 'custom') {
            setCustomStart('');
            setCustomEnd('');
        }
    };

    if (isLoading && !stats) {
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
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-purple-600 shadow-lg shadow-accent/20">
                    <TrophyIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t('Admin Statistics')}</h1>
                    <p className="text-xs text-gray-500 dark:text-slate-400">{t('Platform overview and metrics')}</p>
                </div>

                {isFetching && (
                    <div className="ml-auto">
                        <LoadingSpinner size="sm" />
                    </div>
                )}
            </div>

            {/* Date Range Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-gradient-to-br from-white to-gray-50/50 dark:from-slate-800 dark:to-slate-800/50 rounded-2xl border border-gray-200/60 dark:border-slate-700/60 px-4 py-3">
                <div className="flex items-center gap-1 flex-wrap">
                    {presets.map((preset) => (
                        <button
                            key={preset.key}
                            onClick={() => handlePreset(preset.key)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                activePreset === preset.key
                                    ? 'bg-accent text-white shadow-sm shadow-accent/25'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700/50'
                            }`}
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>

                {/* Custom date inputs */}
                {activePreset === 'custom' && (
                    <div className="flex items-center gap-2 sm:ml-auto">
                        <input
                            type="date"
                            value={customStart}
                            onChange={(e) => setCustomStart(e.target.value)}
                            min={earliestDate ?? undefined}
                            max={customEnd || new Date().toISOString().split('T')[0]}
                            className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none transition-all"
                        />
                        <span className="text-gray-300 dark:text-slate-600">—</span>
                        <input
                            type="date"
                            value={customEnd}
                            onChange={(e) => setCustomEnd(e.target.value)}
                            min={customStart || (earliestDate ?? undefined)}
                            max={new Date().toISOString().split('T')[0]}
                            className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none transition-all"
                        />
                    </div>
                )}

                {/* Active range display */}
                {activePreset !== 'custom' && stats.start_date && (
                    <div className="text-[11px] text-gray-400 dark:text-slate-500 sm:ml-auto tabular-nums font-mono">
                        {stats.start_date} — {stats.end_date}
                    </div>
                )}
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <KpiCard
                    label={t('Total Books')}
                    value={stats.total_books}
                    icon={<BookIcon className="w-5 h-5 text-white" />}
                    gradient="from-indigo-500 to-blue-600"
                    shadowColor="shadow-indigo-500/20"
                />
                <KpiCard
                    label={t('Active Users')}
                    value={stats.active_users_count}
                    icon={<UserIcon className="w-5 h-5 text-white" />}
                    gradient="from-emerald-500 to-teal-600"
                    shadowColor="shadow-emerald-500/20"
                />
                <KpiCard
                    label={t('Reading Time')}
                    value={stats.total_formatted}
                    icon={<ClockIcon className="w-5 h-5 text-white" />}
                    gradient="from-amber-500 to-orange-600"
                    shadowColor="shadow-amber-500/20"
                />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {stats.verified_users_by_day.length > 1 && (
                    <DailyChart
                        data={stats.verified_users_by_day}
                        title={t('Verified Users')}
                        color="#10b981"
                        gradientId="verifiedFill"
                        icon={<UserIcon className="h-4 w-4 text-emerald-500" />}
                        tooltipLabel={t('users')}
                    />
                )}
                {stats.books_by_day.length > 1 && (
                    <DailyChart
                        data={stats.books_by_day}
                        title={t('Total Books')}
                        color="#6366f1"
                        gradientId="booksFill"
                        icon={<BookIcon className="h-4 w-4 text-indigo-500" />}
                        tooltipLabel={t('Books').toLowerCase()}
                    />
                )}
                {stats.reading_hours_by_day.length > 1 && (
                    <DailyChart
                        data={stats.reading_hours_by_day}
                        title={t('Total Reading Hours')}
                        color="#f59e0b"
                        gradientId="hoursFill"
                        icon={<ClockIcon className="h-4 w-4 text-amber-500" />}
                        tooltipLabel="h"
                    />
                )}
            </div>

            {/* Top Readers (Last 12 Months) */}
            {stats.top_readers.readers.length > 0 && (() => {
                const { months, readers } = stats.top_readers;
                const allHours = readers.flatMap(r => r.monthly_hours);
                const maxHours = Math.max(...allHours, 1);

                const getCellStyle = (hours: number) => {
                    if (hours === 0) return {};
                    const intensity = Math.min(hours / maxHours, 1);
                    const opacity = 0.15 + intensity * 0.85;
                    return { backgroundColor: `rgba(99, 102, 241, ${opacity})` };
                };

                const lineColors = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];

                const chartW = 800;
                const chartH = 220;
                const padL = 40;
                const padR = 12;
                const padT = 12;
                const padB = 32;
                const innerW = chartW - padL - padR;
                const innerH = chartH - padT - padB;
                const chartMax = Math.max(...readers.flatMap(r => r.monthly_hours), 1);

                const cx = (i: number) => padL + (i / (months.length - 1)) * innerW;
                const cy = (val: number) => padT + innerH - (val / chartMax) * innerH;

                const buildPath = (hours: number[]) => {
                    if (hours.length < 2) return `M ${cx(0)},${cy(hours[0])}`;
                    const pts = hours.map((h, i) => ({ x: cx(i), y: cy(h) }));
                    let path = `M ${pts[0].x},${pts[0].y}`;
                    for (let i = 0; i < pts.length - 1; i++) {
                        const cp1x = pts[i].x + (pts[i + 1].x - pts[i].x) / 3;
                        const cp2x = pts[i].x + 2 * (pts[i + 1].x - pts[i].x) / 3;
                        path += ` C ${cp1x},${pts[i].y} ${cp2x},${pts[i + 1].y} ${pts[i + 1].x},${pts[i + 1].y}`;
                    }
                    return path;
                };

                return (
                    <div className="bg-gradient-to-br from-white to-gray-50/50 dark:from-slate-800 dark:to-slate-800/50 rounded-2xl border border-gray-200/60 dark:border-slate-700/60 p-5">
                        <div className="flex items-center gap-2.5 mb-5">
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 shadow-md shadow-amber-500/20">
                                <TrophyIcon className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{t('Top Readers')}</h2>
                                <p className="text-[11px] text-gray-400 dark:text-slate-500">{t('Last 12 months')}</p>
                            </div>
                        </div>

                        {/* Heatmap */}
                        <div className="overflow-x-auto -mx-5 px-5">
                            <table className="w-full min-w-[640px]">
                                <thead>
                                    <tr>
                                        <th className="text-left text-[11px] font-semibold text-gray-400 dark:text-slate-500 pb-2 pr-3 w-36"></th>
                                        {months.map((month) => (
                                            <th key={month} className="text-center text-[10px] font-medium text-gray-300 dark:text-slate-600 pb-2 px-0.5 font-mono">
                                                {month.slice(5)}
                                            </th>
                                        ))}
                                        <th className="text-right text-[11px] font-semibold text-gray-400 dark:text-slate-500 pb-2 pl-3">{t('Total')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {readers.map((reader, index) => {
                                        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : null;
                                        return (
                                            <tr key={reader.name}>
                                                <td className="py-1 pr-3">
                                                    <div className="flex items-center gap-2">
                                                        {medal ? (
                                                            <span className="text-sm w-5 text-center">{medal}</span>
                                                        ) : (
                                                            <span className="text-[11px] text-gray-300 dark:text-slate-600 w-5 text-center tabular-nums">{index + 1}</span>
                                                        )}
                                                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-slate-700 dark:to-slate-600 flex-shrink-0">
                                                            <span className="text-[10px] font-bold text-gray-500 dark:text-slate-300">
                                                                {reader.name.charAt(0).toUpperCase()}
                                                            </span>
                                                        </div>
                                                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{reader.name}</span>
                                                    </div>
                                                </td>
                                                {reader.monthly_hours.map((hours, i) => (
                                                    <td key={months[i]} className="py-1 px-0.5">
                                                        <div
                                                            className={`rounded-md h-7 flex items-center justify-center text-[11px] tabular-nums ${
                                                                hours > 0
                                                                    ? 'text-white font-medium'
                                                                    : 'bg-gray-50 dark:bg-slate-700/20 text-gray-200 dark:text-slate-700'
                                                            }`}
                                                            style={getCellStyle(hours)}
                                                            title={`${reader.name} — ${months[i]}: ${hours}h`}
                                                        >
                                                            {hours > 0 ? hours : ''}
                                                        </div>
                                                    </td>
                                                ))}
                                                <td className="py-1 pl-3 text-right">
                                                    <span className="text-sm font-bold text-accent tabular-nums">{reader.total_hours}h</span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Line Chart */}
                        <div className="mt-6 overflow-x-auto -mx-5 px-5">
                            <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full min-w-[500px]" preserveAspectRatio="xMidYMid meet">
                                {Array.from({ length: 5 }, (_, i) => {
                                    const val = (chartMax / 4) * i;
                                    const yPos = cy(val);
                                    return (
                                        <g key={i}>
                                            <line x1={padL} x2={chartW - padR} y1={yPos} y2={yPos} stroke="currentColor" className="text-gray-100 dark:text-slate-700/50" strokeWidth="1" strokeDasharray={i === 0 ? undefined : '4 4'} />
                                            <text x={padL - 6} y={yPos + 4} textAnchor="end" className="fill-gray-300 dark:fill-slate-600" fontSize="9" fontFamily="ui-monospace, monospace">
                                                {Math.round(val)}h
                                            </text>
                                        </g>
                                    );
                                })}
                                {months.map((month, i) => (
                                    <text key={month} x={cx(i)} y={chartH - 4} textAnchor="middle" className="fill-gray-300 dark:fill-slate-600" fontSize="9" fontFamily="ui-monospace, monospace">
                                        {month.slice(5)}
                                    </text>
                                ))}
                                {readers.map((reader, ri) => {
                                    const color = lineColors[ri % lineColors.length];
                                    return (
                                        <g key={reader.name}>
                                            <path d={buildPath(reader.monthly_hours)} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                            {reader.monthly_hours.map((h, i) => (
                                                <circle key={i} cx={cx(i)} cy={cy(h)} r="3" fill={color} stroke="white" strokeWidth="1.5" className="opacity-0 hover:opacity-100 transition-opacity">
                                                    <title>{`${reader.name}: ${h}h`}</title>
                                                </circle>
                                            ))}
                                            <circle cx={cx(months.length - 1)} cy={cy(reader.monthly_hours[reader.monthly_hours.length - 1])} r="3.5" fill="white" stroke={color} strokeWidth="2" />
                                        </g>
                                    );
                                })}
                            </svg>
                            <div className="flex flex-wrap gap-4 mt-3 justify-center">
                                {readers.map((reader, ri) => (
                                    <div key={reader.name} className="flex items-center gap-1.5">
                                        <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: lineColors[ri % lineColors.length] }} />
                                        <span className="text-[11px] text-gray-500 dark:text-slate-400 font-medium">{reader.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* User Activity Table */}
            {stats.users.length > 0 ? (
                <div className="bg-gradient-to-br from-white to-gray-50/50 dark:from-slate-800 dark:to-slate-800/50 rounded-2xl border border-gray-200/60 dark:border-slate-700/60 overflow-hidden">
                    <div className="px-6 py-4 flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 shadow-md shadow-violet-500/20">
                            <TrophyIcon className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{t('Reading Time by User')}</h2>
                            <p className="text-[11px] text-gray-400 dark:text-slate-500">{stats.users.length} {t('Active Users').toLowerCase()}</p>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-t border-gray-100 dark:border-slate-700/50">
                                    <th className="text-left text-[11px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider px-6 py-2.5">
                                        #
                                    </th>
                                    <th className="text-left text-[11px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider px-6 py-2.5">
                                        {t('User')}
                                    </th>
                                    {stats.clients.map((client) => (
                                        <th key={client.key} className="text-right text-[11px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider px-6 py-2.5">
                                            {client.label}
                                        </th>
                                    ))}
                                    <th className="text-right text-[11px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider px-6 py-2.5">
                                        {t('Total')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.users.map((user, index) => {
                                    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : null;
                                    // Compute bar width relative to top user
                                    const maxHours = stats.users[0]?.total_hours || 1;
                                    const barPct = Math.max((user.total_hours / maxHours) * 100, 2);

                                    return (
                                        <tr key={user.user_id} className="group border-t border-gray-50 dark:border-slate-700/30 hover:bg-gray-50/50 dark:hover:bg-slate-700/20 transition-colors">
                                            <td className="px-6 py-3.5 w-12">
                                                {medal ? (
                                                    <span className="text-sm">{medal}</span>
                                                ) : (
                                                    <span className="text-xs text-gray-300 dark:text-slate-600 tabular-nums">{index + 1}</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-slate-700 dark:to-slate-600">
                                                        <span className="text-xs font-bold text-gray-500 dark:text-slate-300">
                                                            {user.user_name.charAt(0).toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-900 dark:text-white">{user.user_name}</span>
                                                </div>
                                            </td>
                                            {stats.clients.map((client) => {
                                                const clientData = user.clients[client.key];
                                                return (
                                                    <td key={client.key} className="px-6 py-3.5 text-right tabular-nums">
                                                        <span className={`text-sm ${clientData && clientData.hours > 0 ? 'text-gray-700 dark:text-slate-300' : 'text-gray-200 dark:text-slate-700'}`}>
                                                            {clientData ? `${clientData.hours}h` : '0h'}
                                                        </span>
                                                    </td>
                                                );
                                            })}
                                            <td className="px-6 py-3.5 text-right">
                                                <div className="flex items-center justify-end gap-3">
                                                    <div className="hidden sm:block w-24 h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                                                            style={{ width: `${barPct}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-sm font-bold text-accent tabular-nums">
                                                        {user.total_formatted}
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="bg-gradient-to-br from-white to-gray-50/50 dark:from-slate-800 dark:to-slate-800/50 rounded-2xl border border-gray-200/60 dark:border-slate-700/60 p-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                        <div className="p-3 rounded-xl bg-gray-100 dark:bg-slate-700">
                            <ClockIcon className="h-6 w-6 text-gray-300 dark:text-slate-600" />
                        </div>
                        <p className="text-sm text-gray-400 dark:text-slate-500">{t('No reading activity this month')}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
