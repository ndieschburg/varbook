import { useTranslation } from 'react-i18next';
import { useAdminActivityStats } from '@/api/hooks';
import { LoadingSpinner } from '@/components/ui';
import { UserIcon, ClockIcon, BookIcon } from '@/components/icons';
import type { AdminBooksByDay } from '@/types';

/**
 * SVG line chart displaying total book count evolution day by day
 */
function BooksChart({ data }: { data: AdminBooksByDay[] }) {
    const { t } = useTranslation();

    const chartW = 800;
    const chartH = 240;
    const padL = 50;
    const padR = 16;
    const padT = 16;
    const padB = 40;
    const innerW = chartW - padL - padR;
    const innerH = chartH - padT - padB;

    const totals = data.map(d => d.total);
    const minVal = Math.min(...totals);
    const maxVal = Math.max(...totals);
    const range = maxVal - minVal || 1;

    const x = (i: number) => padL + (i / (data.length - 1)) * innerW;
    const y = (val: number) => padT + innerH - ((val - minVal) / range) * innerH;

    const points = data.map((d, i) => `${x(i)},${y(d.total)}`).join(' ');

    // Y-axis: 4 steps
    const stepCount = 4;
    const ySteps = Array.from({ length: stepCount + 1 }, (_, i) => minVal + (range / stepCount) * i);

    // X-axis labels: show ~7 evenly spaced dates
    const labelCount = Math.min(7, data.length);
    const labelIndices = Array.from({ length: labelCount }, (_, i) =>
        Math.round((i / (labelCount - 1)) * (data.length - 1))
    );

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
            <div className="flex items-center gap-2 mb-4">
                <BookIcon className="h-5 w-5 text-indigo-500" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('Total Books')}</h2>
                <span className="text-sm text-gray-400 dark:text-slate-500">({t('This month')})</span>
            </div>
            <div className="overflow-x-auto -mx-6 px-6">
                <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full min-w-[400px]" preserveAspectRatio="xMidYMid meet">
                    {/* Horizontal grid lines + Y labels */}
                    {ySteps.map((val, i) => {
                        const yPos = y(val);
                        return (
                            <g key={i}>
                                <line x1={padL} x2={chartW - padR} y1={yPos} y2={yPos} stroke="currentColor" className="text-gray-200 dark:text-slate-700" strokeWidth="1" />
                                <text x={padL - 8} y={yPos + 4} textAnchor="end" className="fill-gray-400 dark:fill-slate-500" fontSize="10">
                                    {Math.round(val)}
                                </text>
                            </g>
                        );
                    })}

                    {/* X labels */}
                    {labelIndices.map((idx) => (
                        <text key={idx} x={x(idx)} y={chartH - 6} textAnchor="middle" className="fill-gray-400 dark:fill-slate-500" fontSize="10">
                            {data[idx].date.slice(5)}
                        </text>
                    ))}

                    {/* Area fill */}
                    <polygon
                        points={`${x(0)},${y(minVal)} ${points} ${x(data.length - 1)},${y(minVal)}`}
                        fill="url(#booksFill)"
                        opacity="0.3"
                    />
                    <defs>
                        <linearGradient id="booksFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#6366f1" />
                            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                        </linearGradient>
                    </defs>

                    {/* Line */}
                    <polyline
                        points={points}
                        fill="none"
                        stroke="#6366f1"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />

                    {/* Dots */}
                    {data.map((d, i) => (
                        <circle key={i} cx={x(i)} cy={y(d.total)} r="3" fill="#6366f1" stroke="white" strokeWidth="1.5">
                            <title>{`${d.date}: ${d.total} ${t('Books').toLowerCase()}`}</title>
                        </circle>
                    ))}
                </svg>
            </div>
        </div>
    );
}

/**
 * Admin stats page showing monthly user activity with per-client breakdown
 *
 * @description Displays header KPIs (active users this month, total hours)
 * and a table of users sorted by reading hours descending, with columns per client.
 * Users with 0h are excluded from the table.
 */
export function AdminStatsPage() {
    const { t } = useTranslation();
    const { data: stats, isLoading } = useAdminActivityStats();

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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('Admin Statistics')}</h1>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 dark:text-slate-400 text-sm">{t('Active Users This Month')}</p>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.active_users_this_month}</p>
                        </div>
                        <div className="p-3 bg-indigo-600/20 rounded-xl">
                            <UserIcon className="h-6 w-6 text-indigo-400" />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 dark:text-slate-400 text-sm">{t('Total Hours This Month')}</p>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.total_formatted_this_month}</p>
                        </div>
                        <div className="p-3 bg-amber-600/20 rounded-xl">
                            <ClockIcon className="h-6 w-6 text-amber-400" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Books Total - Line Chart */}
            {stats.books_by_day.length > 1 && (
                <BooksChart data={stats.books_by_day} />
            )}

            {/* User Activity Table */}
            {stats.users.length > 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('Reading Time by User')}</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-slate-700/50">
                                    <th className="text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider px-6 py-3">
                                        {t('User')}
                                    </th>
                                    {stats.clients.map((client) => (
                                        <th key={client.key} className="text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider px-6 py-3">
                                            {client.label}
                                        </th>
                                    ))}
                                    <th className="text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider px-6 py-3">
                                        {t('Total')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                                {stats.users.map((user) => (
                                    <tr key={user.user_id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="font-medium text-gray-900 dark:text-white">{user.user_name}</span>
                                        </td>
                                        {stats.clients.map((client) => {
                                            const clientData = user.clients[client.key];
                                            return (
                                                <td key={client.key} className="px-6 py-4 text-right tabular-nums">
                                                    {clientData ? (
                                                        <span className="text-gray-700 dark:text-slate-300">{clientData.hours}h</span>
                                                    ) : (
                                                        <span className="text-gray-300 dark:text-slate-600">-</span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                        <td className="px-6 py-4 text-right">
                                            <span className="font-semibold text-indigo-600 dark:text-indigo-400 tabular-nums">
                                                {user.total_formatted}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-12 text-center">
                    <p className="text-gray-500 dark:text-slate-400">{t('No reading activity this month')}</p>
                </div>
            )}
        </div>
    );
}
