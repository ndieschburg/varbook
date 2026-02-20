import { useTranslation } from 'react-i18next';

interface LibraryFiltersProps {
    search: string;
    onSearchChange: (value: string) => void;
    status: string;
    onStatusChange: (value: string) => void;
    sort: string;
    onSortChange: (value: string) => void;
    sortDirection: 'asc' | 'desc';
    onSortDirectionToggle: () => void;
}

function SearchIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
    );
}

function SortAscIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
        </svg>
    );
}

function SortDescIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
        </svg>
    );
}

export function LibraryFilters({
    search,
    onSearchChange,
    status,
    onStatusChange,
    sort,
    onSortChange,
    sortDirection,
    onSortDirectionToggle,
}: LibraryFiltersProps) {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
                <input
                    type="text"
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder={t('Search by title or author...')}
                    className="w-full bg-slate-800 border-slate-700 rounded-lg text-slate-100 placeholder-slate-400 focus:ring-indigo-500 focus:border-indigo-500 text-sm py-2 pl-10 pr-4"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <SearchIcon className="h-5 w-5 text-slate-400" />
                </div>
            </div>

            {/* Filters & Sort */}
            <div className="flex items-center gap-3">
                {/* Status Filter */}
                <select
                    value={status}
                    onChange={(e) => onStatusChange(e.target.value)}
                    className="bg-slate-800 border-slate-700 rounded-lg text-slate-100 text-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500"
                >
                    <option value="">{t('All Status')}</option>
                    <option value="not_started">{t('Not Started')}</option>
                    <option value="reading">{t('Reading')}</option>
                    <option value="finished">{t('Finished')}</option>
                </select>

                {/* Sort */}
                <select
                    value={sort}
                    onChange={(e) => onSortChange(e.target.value)}
                    className="bg-slate-800 border-slate-700 rounded-lg text-slate-100 text-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500"
                >
                    <option value="recent">{t('Recent')}</option>
                    <option value="title">{t('Title')}</option>
                    <option value="author">{t('Author')}</option>
                    <option value="progress">{t('Progress')}</option>
                </select>

                {/* Sort Direction */}
                <button
                    onClick={onSortDirectionToggle}
                    className="p-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-slate-100 transition-colors"
                >
                    {sortDirection === 'asc' ? (
                        <SortAscIcon className="h-5 w-5" />
                    ) : (
                        <SortDescIcon className="h-5 w-5" />
                    )}
                </button>
            </div>
        </div>
    );
}
