import { useRef, useState, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useBook, useSettings } from '@/api/hooks';
import { useEpubReader } from '@/hooks';
import { themeBackgrounds } from '@/hooks/useReaderSettings';
import { LoadingSpinner } from '@/components/ui';
import { TocPanel, SearchPanel, SettingsPanel } from '@/components/reader';
import { ArrowLeftIcon, MenuIcon, CogIcon, ChevronLeftIcon, ChevronRightIcon, SearchIcon } from '@/components/icons';
import { setDebugMode } from '@/services/debugLogger';

type ActivePanel = 'toc' | 'search' | 'settings' | null;

export function ReaderPage() {
    const { t } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const bookId = Number(id);
    const containerRef = useRef<HTMLDivElement>(null);

    const { data: bookData, isLoading: bookDataLoading, error: bookError } = useBook(bookId);
    const { data: settingsData } = useSettings();
    const epubUrl = `/api/books/${bookId}/download`;

    // Extract debug mode from settings
    const debugMode = useMemo(() => {
        if (!settingsData) return false;
        const readerCategory = settingsData.categories.find(c => c.key === 'reader');
        const debugSetting = readerCategory?.settings.find(s => s.key === 'reader.debug_mode');
        return debugSetting?.value === true;
    }, [settingsData]);

    // Set global debug mode for offline sync logging
    useEffect(() => {
        setDebugMode(debugMode);
    }, [debugMode]);

    const {
        isLoading,
        error,
        progress,
        locationsReady,
        toc,
        locationInfo,
        searchResults,
        isSearching,
        syncingPositionFrom,
        settings,
        setTheme,
        setFontSize,
        setFontFamily,
        setLineHeight,
        setMargins,
        setTextSelection,
        setFullscreenLock,
        nextPage,
        prevPage,
        goTo,
        goToPercentage,
        search,
        goToSearchResult,
        needsFullscreenRestore,
        restoreFullscreen,
    } = useEpubReader({
        bookId,
        epubUrl,
        containerRef,
        bookMeta: bookData ? {
            title: bookData.title,
            author: bookData.author,
            coverUrl: bookData.cover_url,
        } : undefined,
        debugMode,
    });

    const [activePanel, setActivePanel] = useState<ActivePanel>(null);
    const [showControls, setShowControls] = useState(true);

    // Toggle panel: close if already open, open and close others if closed
    const togglePanel = (panel: ActivePanel) => {
        setActivePanel(current => current === panel ? null : panel);
    };

    // Detect iOS - Screen Orientation API not supported
    const isIOS = useMemo(() => {
        return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
               (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    }, []);

    // Show error if book not found
    if (bookError || (!bookDataLoading && !bookData)) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-400">{t('Book file not found')}</p>
                    <Link to="/library" className="text-indigo-400 hover:text-indigo-300 mt-4 inline-block">
                        {t('Back to Library')}
                    </Link>
                </div>
            </div>
        );
    }

    // Disable browser back/forward swipe gestures and intercept back navigation
    useEffect(() => {
        // Apply CSS properties to block browser navigation gestures
        const originalStyles = {
            overscrollBehavior: document.body.style.overscrollBehavior,
            touchAction: document.body.style.touchAction,
        };

        document.body.style.overscrollBehavior = 'none';
        document.body.style.touchAction = 'pan-y pinch-zoom';

        // For PWA: Push fake history entries and intercept back navigation
        // Convert swipe-back gesture into "previous page" in the book
        const readerHistoryState = { isReaderPage: true, bookId };
        // Push 2 entries so we have buffer for the back gesture
        history.pushState(readerHistoryState, '', window.location.href);
        history.pushState(readerHistoryState, '', window.location.href);

        const handlePopState = () => {
            // If we're still on the reader page, go to previous page and restore history buffer
            if (window.location.pathname.includes('/read/')) {
                prevPage();
                history.pushState(readerHistoryState, '', window.location.href);
            }
        };

        window.addEventListener('popstate', handlePopState);

        return () => {
            document.body.style.overscrollBehavior = originalStyles.overscrollBehavior;
            document.body.style.touchAction = originalStyles.touchAction;
            window.removeEventListener('popstate', handlePopState);
        };
    }, [bookId, prevPage]);

    // Always render the full layout so containerRef is available
    return (
        <div className="h-screen flex flex-col bg-gray-900">
            {/* Top bar */}
            {showControls && (
                <div className="flex-shrink-0 bg-gray-800 border-b border-gray-700 z-20">
                    <div className="h-14 flex items-center justify-between px-4">
                        <div className="flex items-center gap-4 min-w-0">
                            <Link
                                to={`/books/${bookId}`}
                                className="text-gray-400 hover:text-white transition-colors flex-shrink-0"
                            >
                                <ArrowLeftIcon className="h-5 w-5" />
                            </Link>
                            <div className="min-w-0">
                                <h1 className="text-white font-medium truncate text-sm">
                                    {bookData?.title || t('Loading...')}
                                </h1>
                                {locationInfo.currentChapter && (
                                    <p className="text-gray-400 text-xs truncate">
                                        {locationInfo.currentChapter}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                                onClick={() => togglePanel('search')}
                                className={`p-2 transition-colors ${activePanel === 'search' ? 'text-indigo-400' : 'text-gray-400 hover:text-white'}`}
                                title={t('Search')}
                            >
                                <SearchIcon className="h-5 w-5" />
                            </button>
                            <button
                                onClick={() => togglePanel('toc')}
                                className={`p-2 transition-colors ${activePanel === 'toc' ? 'text-indigo-400' : 'text-gray-400 hover:text-white'}`}
                                title={t('Table of Contents')}
                            >
                                <MenuIcon className="h-5 w-5" />
                            </button>
                            <button
                                onClick={() => togglePanel('settings')}
                                className={`p-2 transition-colors ${activePanel === 'settings' ? 'text-indigo-400' : 'text-gray-400 hover:text-white'}`}
                                title={t('Settings')}
                            >
                                <CogIcon className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main content */}
            <div className="flex-1 relative overflow-hidden">
                {/* Reader container - always rendered so ref is available */}
                <div
                    ref={containerRef}
                    className={`absolute inset-0 ${themeBackgrounds[settings.theme]}`}
                    onClick={() => setShowControls(!showControls)}
                />

                {/* Loading overlay - shown during book data or epub loading */}
                {(bookDataLoading || isLoading) && (
                    <div className="absolute inset-0 bg-gray-900 flex items-center justify-center z-10">
                        <div className="text-center">
                            <LoadingSpinner size="lg" />
                            <p className="text-gray-400 mt-4">{t('Loading book...')}</p>
                        </div>
                    </div>
                )}

                {/* Syncing position overlay - shown when loading position from external client */}
                {syncingPositionFrom && (
                    <div className="absolute inset-0 bg-gray-900/80 flex items-center justify-center z-10">
                        <div className="text-center">
                            <LoadingSpinner size="lg" />
                            <p className="text-gray-300 mt-4">
                                {t('Syncing position from {{client}}...', { client: syncingPositionFrom })}
                            </p>
                        </div>
                    </div>
                )}

                {/* Error overlay */}
                {error && (
                    <div className="absolute inset-0 bg-gray-900 flex items-center justify-center z-10">
                        <div className="text-center text-red-400">
                            <p>Failed to load book</p>
                            <p className="text-sm mt-2">{error}</p>
                        </div>
                    </div>
                )}

                {/* Fullscreen restore overlay - shown when returning from sleep/app switch */}
                {needsFullscreenRestore && (
                    <button
                        onClick={restoreFullscreen}
                        className="absolute inset-0 bg-black/80 flex items-center justify-center z-30 cursor-pointer"
                    >
                        <div className="text-center p-6">
                            <div className="text-4xl mb-4">🔒</div>
                            <p className="text-white text-lg font-medium mb-2">
                                {t('Tap to restore fullscreen')}
                            </p>
                            <p className="text-gray-400 text-sm">
                                {t('Fullscreen was interrupted')}
                            </p>
                        </div>
                    </button>
                )}

                {/* Navigation buttons - hidden on mobile, swipe is used instead */}
                {!isLoading && !error && !bookDataLoading && (
                    <>
                        <button
                            onClick={(e) => { e.stopPropagation(); prevPage(); }}
                            className="absolute left-0 top-0 bottom-0 w-16 hidden md:flex items-center justify-center text-gray-400/50 hover:text-white hover:bg-black/10 transition-colors z-10 select-none"
                        >
                            <ChevronLeftIcon className="h-8 w-8" />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); nextPage(); }}
                            className="absolute right-0 top-0 bottom-0 w-16 hidden md:flex items-center justify-center text-gray-400/50 hover:text-white hover:bg-black/10 transition-colors z-10 select-none"
                        >
                            <ChevronRightIcon className="h-8 w-8" />
                        </button>
                    </>
                )}

                {/* Panels */}
                {activePanel === 'toc' && (
                    <TocPanel
                        toc={toc}
                        onNavigate={goTo}
                        onClose={() => setActivePanel(null)}
                    />
                )}

                {activePanel === 'search' && (
                    <SearchPanel
                        searchResults={searchResults}
                        isSearching={isSearching}
                        onSearch={search}
                        onResultClick={goToSearchResult}
                        onClose={() => setActivePanel(null)}
                    />
                )}

                {activePanel === 'settings' && (
                    <SettingsPanel
                        settings={settings}
                        isIOS={isIOS}
                        onThemeChange={setTheme}
                        onFontSizeChange={setFontSize}
                        onFontFamilyChange={setFontFamily}
                        onLineHeightChange={setLineHeight}
                        onMarginsChange={setMargins}
                        onTextSelectionChange={setTextSelection}
                        onFullscreenLockChange={setFullscreenLock}
                    />
                )}
            </div>

            {/* Bottom bar with progress */}
            {showControls && (
                <div className="flex-shrink-0 h-12 bg-gray-800 border-t border-gray-700 flex items-center px-4 z-20">
                    {/* Page info */}
                    {locationInfo.totalPages > 0 && (
                        <span className="text-xs text-gray-400 w-20 flex-shrink-0">
                            {locationInfo.currentPage} / {locationInfo.totalPages}
                        </span>
                    )}
                    {/* Progress bar */}
                    <div
                        className="flex-1 h-3 bg-gray-700 rounded-full overflow-hidden cursor-pointer relative group mx-3"
                        onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const percentage = ((e.clientX - rect.left) / rect.width) * 100;
                            goToPercentage(percentage);
                        }}
                    >
                        <div
                            className="h-full bg-indigo-500 transition-all pointer-events-none"
                            style={{ width: `${progress}%` }}
                        />
                        <div
                            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                            style={{ left: `calc(${progress}% - 8px)` }}
                        />
                    </div>
                    {/* Percentage or loading spinner */}
                    <span className="text-sm text-gray-400 w-14 text-right flex-shrink-0 flex items-center justify-end">
                        {locationsReady ? (
                            `${progress.toFixed(1)}%`
                        ) : (
                            <svg className="animate-spin h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        )}
                    </span>
                </div>
            )}
        </div>
    );
}
