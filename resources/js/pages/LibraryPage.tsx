import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useInfiniteBooks, useCurrentlyReading, useSettings } from '@/api/hooks';
import { LoadingSpinner } from '@/components/ui';
import { BookCard, LibraryFilters, BookUploader } from '@/components/library';
import { BookIcon, LibraryIcon } from '@/components/icons';
import type { ListBooksParams } from '@/types';

// Debounce hook to delay API calls while typing
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);

    return debouncedValue;
}

export function LibraryPage() {
    const { t } = useTranslation();
    const { data: settingsData } = useSettings();

    // Extract library settings
    const librarySettings = useMemo(() => {
        if (!settingsData?.categories) {
            return { defaultSort: 'recent', cardsPerRow: 4, showReadingTime: true, showProgressBar: true };
        }
        const libraryCategory = settingsData.categories.find(c => c.key === 'library');
        const getSetting = (key: string, defaultValue: unknown) => {
            const setting = libraryCategory?.settings.find(s => s.key === key);
            return setting?.value ?? defaultValue;
        };
        return {
            defaultSort: getSetting('library.default_sort', 'recent') as string,
            cardsPerRow: getSetting('library.cards_per_row', 4) as number,
            showReadingTime: getSetting('library.show_reading_time', true) as boolean,
            showProgressBar: getSetting('library.show_progress_bar', true) as boolean,
        };
    }, [settingsData]);

    // Filter state - searchInput updates immediately, debouncedSearch triggers API
    const [searchInput, setSearchInput] = useState('');
    const debouncedSearch = useDebounce(searchInput, 300);
    const [status, setStatus] = useState('');
    const [sort, setSort] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [showUploader, setShowUploader] = useState(false);

    // Initialize sort from settings when loaded
    useEffect(() => {
        if (sort === null && librarySettings.defaultSort) {
            setSort(librarySettings.defaultSort);
        }
    }, [sort, librarySettings.defaultSort]);

    // Use the actual sort value or default
    const effectiveSort = sort ?? librarySettings.defaultSort;

    // Build query params with debounced search
    const params: Omit<ListBooksParams, 'page'> = useMemo(() => ({
        search: debouncedSearch || undefined,
        status: status as ListBooksParams['status'] || undefined,
        sort: effectiveSort as ListBooksParams['sort'] || 'recent',
    }), [debouncedSearch, status, effectiveSort]);

    // Use infinite query for pagination
    const {
        data,
        isLoading,
        isFetchingNextPage,
        hasNextPage,
        fetchNextPage,
        refetch,
    } = useInfiniteBooks(params);

    // Separate query for "Continue Reading" section - fetches all books in progress
    const { data: currentlyReading = [] } = useCurrentlyReading();

    // Flatten pages into single array
    const allBooks = useMemo(() => {
        if (!data?.pages) return [];
        return data.pages.flatMap(page => page.data);
    }, [data?.pages]);

    // Get total count from first page (handle array values from corrupted cache)
    const rawTotal = data?.pages[0]?.meta?.total ?? 0;
    const totalBooks = Array.isArray(rawTotal) ? Number(rawTotal[0]) : Number(rawTotal);

    // Show "Continue Reading" only when no filters are applied
    const showCurrentlyReading = !status && !debouncedSearch && currentlyReading.length > 0;

    // Infinite scroll with IntersectionObserver
    const loadMoreRef = useRef<HTMLDivElement>(null);

    const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    useEffect(() => {
        const element = loadMoreRef.current;
        if (!element) return;

        const observer = new IntersectionObserver(handleObserver, {
            root: null,
            rootMargin: '100px', // Load before reaching the bottom
            threshold: 0,
        });

        observer.observe(element);
        return () => observer.disconnect();
    }, [handleObserver]);

    // Only show full loading spinner on initial load (no data yet)
    if (isLoading && !data) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    return (
        <div>
            {/* Uploader Toggle */}
            <div className="mb-6 flex justify-end">
                <button
                    onClick={() => setShowUploader(!showUploader)}
                    className="px-4 py-2 bg-accent hover:opacity-90 text-white rounded-lg font-medium transition-colors"
                >
                    {showUploader ? t('Cancel') : t('Upload')}
                </button>
            </div>

            {/* Uploader */}
            {showUploader && (
                <div className="mb-8">
                    <BookUploader onUploadComplete={() => {
                        setShowUploader(false);
                        refetch();
                    }} />
                </div>
            )}

            {/* Filters */}
            <LibraryFilters
                search={searchInput}
                onSearchChange={setSearchInput}
                status={status}
                onStatusChange={setStatus}
                sort={effectiveSort}
                onSortChange={setSort}
                sortDirection={sortDirection}
                onSortDirectionToggle={() => setSortDirection(d => d === 'asc' ? 'desc' : 'asc')}
            />

            {/* Currently Reading Section */}
            {showCurrentlyReading && (
                <div className="mb-10">
                    {/* Section Header */}
                    <div className="flex items-center gap-3 mb-4">
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/20">
                            <BookIcon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{t('Continue Reading')}</h2>
                            <p className="text-xs text-gray-500 dark:text-slate-400">{t('Pick up where you left off')}</p>
                        </div>
                    </div>

                    {/* Grid Layout - Horizontal scroll for reading cards */}
                    <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 sm:overflow-visible">
                        {currentlyReading.map(book => (
                            <BookCard
                                key={book.id}
                                book={book}
                                variant="reading"
                                showReadingTime={librarySettings.showReadingTime}
                                showProgressBar={librarySettings.showProgressBar}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Library Section */}
            <div>
                {/* Section Header */}
                <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-purple-600 shadow-lg shadow-accent/20">
                        <LibraryIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{t('Library')}</h2>
                        <p className="text-xs text-gray-500 dark:text-slate-400">
                            {totalBooks > 0
                                ? `${allBooks.length} / ${totalBooks} ${t('Books').toLowerCase()}`
                                : t('Your complete collection')}
                        </p>
                    </div>
                </div>

                {/* Books Grid */}
                {allBooks.length > 0 ? (
                    <>
                        <div
                            className="grid gap-4 md:gap-6"
                            data-library-grid
                            style={{
                                gridTemplateColumns: `repeat(2, minmax(0, 1fr))`,
                            }}
                        >
                            <style>{`
                                @media (min-width: 640px) {
                                    [data-library-grid] { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
                                }
                                @media (min-width: 1024px) {
                                    [data-library-grid] { grid-template-columns: repeat(${librarySettings.cardsPerRow}, minmax(0, 1fr)) !important; }
                                }
                                @media (min-width: 1280px) {
                                    [data-library-grid] { grid-template-columns: repeat(${librarySettings.cardsPerRow + 1}, minmax(0, 1fr)) !important; }
                                }
                            `}</style>
                            {allBooks.map(book => (
                                <BookCard
                                    key={book.id}
                                    book={book}
                                    showReadingTime={librarySettings.showReadingTime}
                                    showProgressBar={librarySettings.showProgressBar}
                                />
                            ))}
                        </div>

                        {/* Infinite scroll sentinel & loading indicator */}
                        <div ref={loadMoreRef} className="mt-8 flex justify-center py-4">
                            {isFetchingNextPage ? (
                                <LoadingSpinner size="md" />
                            ) : !hasNextPage && totalBooks > 0 ? (
                                <p className="text-gray-500 dark:text-slate-500 text-sm">
                                    {totalBooks} {t('Books').toLowerCase()}
                                </p>
                            ) : null}
                        </div>
                    </>
                ) : (
                    /* Empty State */
                    <div className="text-center py-16">
                        <BookIcon className="mx-auto h-16 w-16 text-gray-400 dark:text-slate-600" />
                        <h3 className="mt-4 text-lg font-medium text-gray-700 dark:text-slate-300">
                            {t('No books yet')}
                        </h3>
                        <p className="mt-2 text-gray-500 dark:text-slate-500">
                            {t('Upload your first EPUB to get started.')}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
