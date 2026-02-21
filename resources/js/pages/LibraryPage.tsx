import { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useInfiniteBooks, useCurrentlyReading } from '@/api/hooks';
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

    // Filter state - searchInput updates immediately, debouncedSearch triggers API
    const [searchInput, setSearchInput] = useState('');
    const debouncedSearch = useDebounce(searchInput, 300);
    const [status, setStatus] = useState('');
    const [sort, setSort] = useState('recent');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [showUploader, setShowUploader] = useState(false);

    // Build query params with debounced search
    const params: Omit<ListBooksParams, 'page'> = useMemo(() => ({
        search: debouncedSearch || undefined,
        status: status as ListBooksParams['status'] || undefined,
        sort: sort as ListBooksParams['sort'] || 'recent',
    }), [debouncedSearch, status, sort]);

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

    // Get total count from first page
    const totalBooks = data?.pages[0]?.meta?.total ?? 0;

    // Show "Continue Reading" only when no filters are applied
    const showCurrentlyReading = !status && !debouncedSearch && currentlyReading.length > 0;

    // Infinite scroll with Intersection Observer
    const loadMoreRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const element = loadMoreRef.current;
        if (!element) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const [entry] = entries;
                if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
                    fetchNextPage();
                }
            },
            {
                root: null,
                rootMargin: '100px',
                threshold: 0,
            }
        );

        observer.observe(element);
        return () => observer.disconnect();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

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
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
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
                sort={sort}
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
                            <h2 className="text-lg font-semibold text-slate-100">{t('Continue Reading')}</h2>
                            <p className="text-xs text-slate-400">{t('Pick up where you left off')}</p>
                        </div>
                    </div>

                    {/* Grid Layout */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {currentlyReading.map(book => (
                            <BookCard key={book.id} book={book} variant="reading" />
                        ))}
                    </div>
                </div>
            )}

            {/* Library Section */}
            <div>
                {/* Section Header */}
                <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20">
                        <LibraryIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-slate-100">{t('Library')}</h2>
                        <p className="text-xs text-slate-400">
                            {totalBooks > 0
                                ? `${allBooks.length} / ${totalBooks} ${t('Books').toLowerCase()}`
                                : t('Your complete collection')}
                        </p>
                    </div>
                </div>

                {/* Books Grid */}
                {allBooks.length > 0 ? (
                    <>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                            {allBooks.map(book => (
                                <BookCard key={book.id} book={book} />
                            ))}
                        </div>

                        {/* Load More Trigger */}
                        <div ref={loadMoreRef} className="mt-8 flex justify-center">
                            {isFetchingNextPage && (
                                <LoadingSpinner size="md" />
                            )}
                            {!hasNextPage && allBooks.length > 0 && (
                                <p className="text-slate-500 text-sm">
                                    {totalBooks} {t('Books').toLowerCase()}
                                </p>
                            )}
                        </div>
                    </>
                ) : (
                    /* Empty State */
                    <div className="text-center py-16">
                        <BookIcon className="mx-auto h-16 w-16 text-slate-600" />
                        <h3 className="mt-4 text-lg font-medium text-slate-300">
                            {t('No books yet')}
                        </h3>
                        <p className="mt-2 text-slate-500">
                            {t('Upload your first EPUB to get started.')}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
