import { useRef, useState, useMemo, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useBook, useSettings } from '@/api/hooks';
import { useEpubReader } from '@/hooks';
import { LoadingSpinner } from '@/components/ui';
import { ArrowLeftIcon, MenuIcon, CogIcon, ChevronLeftIcon, ChevronRightIcon, SearchIcon } from '@/components/icons';
import { setDebugMode } from '@/services/debugLogger';
import type { Theme, FontFamily, Margins, FlowMode } from '@/hooks/useReaderSettings';

export function ReaderPage() {
    const { t } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
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
        toc,
        locationInfo,
        searchResults,
        isSearching,
        settings,
        setTheme,
        setFontSize,
        setFontFamily,
        setLineHeight,
        setMargins,
        setFlowMode,
        setTextSelection,
        nextPage,
        prevPage,
        goTo,
        goToPercentage,
        search,
        clearSearch,
        goToSearchResult,
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

    const [showToc, setShowToc] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showControls, setShowControls] = useState(true);

    const themeColors: Record<Theme, string> = {
        light: 'bg-white',
        dark: 'bg-slate-800',
        sepia: 'bg-[#f4ecd8]',
    };

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

    // Disable browser back/forward swipe gestures while in reader
    useEffect(() => {
        document.body.style.overscrollBehaviorX = 'none';

        let touchStartX = 0;
        let touchStartedNearEdge = false;
        const edgeThreshold = 30;

        const handleTouchStart = (e: TouchEvent) => {
            touchStartX = e.touches[0].clientX;
            const screenWidth = window.innerWidth;
            touchStartedNearEdge = touchStartX < edgeThreshold || touchStartX > screenWidth - edgeThreshold;
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (touchStartedNearEdge) {
                e.preventDefault();
            }
        };

        const handleTouchEnd = () => {
            touchStartedNearEdge = false;
        };

        document.addEventListener('touchstart', handleTouchStart, { passive: true });
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd, { passive: true });

        return () => {
            document.body.style.overscrollBehaviorX = '';
            document.removeEventListener('touchstart', handleTouchStart);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
        };
    }, []);

    // Always render the full layout so containerRef is available
    return (
        <div className="h-screen flex flex-col bg-gray-900 touch-pan-y">
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
                                onClick={() => { setShowSearch(!showSearch); setShowToc(false); setShowSettings(false); }}
                                className={`p-2 transition-colors ${showSearch ? 'text-indigo-400' : 'text-gray-400 hover:text-white'}`}
                                title={t('Search')}
                            >
                                <SearchIcon className="h-5 w-5" />
                            </button>
                            <button
                                onClick={() => { setShowToc(!showToc); setShowSearch(false); setShowSettings(false); }}
                                className={`p-2 transition-colors ${showToc ? 'text-indigo-400' : 'text-gray-400 hover:text-white'}`}
                                title={t('Table of Contents')}
                            >
                                <MenuIcon className="h-5 w-5" />
                            </button>
                            <button
                                onClick={() => { setShowSettings(!showSettings); setShowToc(false); setShowSearch(false); }}
                                className={`p-2 transition-colors ${showSettings ? 'text-indigo-400' : 'text-gray-400 hover:text-white'}`}
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
                    className={`absolute inset-0 ${themeColors[settings.theme]}`}
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

                {/* Error overlay */}
                {error && (
                    <div className="absolute inset-0 bg-gray-900 flex items-center justify-center z-10">
                        <div className="text-center text-red-400">
                            <p>Failed to load book</p>
                            <p className="text-sm mt-2">{error}</p>
                        </div>
                    </div>
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

                {/* TOC sidebar */}
                {showToc && (
                    <div className="absolute left-0 top-0 bottom-0 w-80 bg-gray-800 border-r border-gray-700 overflow-y-auto z-20">
                        <div className="p-4 border-b border-gray-700">
                            <h2 className="text-lg font-semibold text-white">{t('Table of Contents')}</h2>
                        </div>
                        <div className="p-2">
                            {toc.map((item, index) => (
                                <button
                                    key={index}
                                    onClick={() => { goTo(item.href); setShowToc(false); }}
                                    className="w-full text-left px-3 py-2 text-gray-300 hover:bg-gray-700 rounded transition-colors"
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Search sidebar */}
                {showSearch && (
                    <div className="absolute left-0 top-0 bottom-0 w-80 bg-gray-800 border-r border-gray-700 overflow-y-auto z-20">
                        <div className="p-4 border-b border-gray-700">
                            <h2 className="text-lg font-semibold text-white mb-3">{t('Search')}</h2>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && searchQuery.trim()) {
                                            search(searchQuery);
                                        }
                                    }}
                                    placeholder={t('Search in book...')}
                                    className="flex-1 bg-gray-700 border-gray-600 rounded text-white placeholder-gray-400 text-sm px-3 py-2"
                                    autoFocus
                                />
                                <button
                                    onClick={() => searchQuery.trim() && search(searchQuery)}
                                    disabled={isSearching || !searchQuery.trim()}
                                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded text-sm"
                                >
                                    {isSearching ? '...' : t('Go')}
                                </button>
                            </div>
                        </div>
                        <div className="p-2">
                            {isSearching && (
                                <div className="text-center py-8 text-gray-400">
                                    <LoadingSpinner size="sm" />
                                    <p className="mt-2 text-sm">{t('Searching...')}</p>
                                </div>
                            )}
                            {!isSearching && searchResults.length === 0 && searchQuery && (
                                <p className="text-center py-8 text-gray-400 text-sm">
                                    {t('No results found')}
                                </p>
                            )}
                            {!isSearching && searchResults.length > 0 && (
                                <>
                                    <p className="text-xs text-gray-400 px-3 py-2">
                                        {searchResults.length} {t('results')}
                                    </p>
                                    {searchResults.map((result, index) => (
                                        <button
                                            key={index}
                                            onClick={() => {
                                                goToSearchResult(result);
                                                setShowSearch(false);
                                            }}
                                            className="w-full text-left px-3 py-2 text-gray-300 hover:bg-gray-700 rounded transition-colors text-sm"
                                        >
                                            <span
                                                dangerouslySetInnerHTML={{
                                                    __html: result.excerpt.replace(
                                                        new RegExp(`(${searchQuery})`, 'gi'),
                                                        '<mark class="bg-yellow-500/30 text-yellow-200">$1</mark>'
                                                    ),
                                                }}
                                            />
                                        </button>
                                    ))}
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Settings sidebar */}
                {showSettings && (
                    <div className="absolute right-0 top-0 bottom-0 w-80 bg-gray-800 border-l border-gray-700 overflow-y-auto z-20">
                        <div className="p-4 border-b border-gray-700">
                            <h2 className="text-lg font-semibold text-white">{t('Settings')}</h2>
                        </div>
                        <div className="p-4 space-y-6">
                            {/* Theme */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">{t('Theme')}</label>
                                <div className="flex gap-2">
                                    {(['light', 'dark', 'sepia'] as Theme[]).map(theme => (
                                        <button
                                            key={theme}
                                            onClick={() => setTheme(theme)}
                                            className={`flex-1 py-2 rounded border ${
                                                settings.theme === theme
                                                    ? 'border-indigo-500 bg-indigo-600/20'
                                                    : 'border-gray-600 hover:border-gray-500'
                                            }`}
                                        >
                                            <span className="text-gray-300 text-sm capitalize">{t(theme.charAt(0).toUpperCase() + theme.slice(1))}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Font Size */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">{t('Font Size')}</label>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setFontSize(settings.fontSize - 10)}
                                        className="w-10 h-10 rounded bg-gray-700 text-gray-300 hover:bg-gray-600"
                                    >
                                        -
                                    </button>
                                    <span className="flex-1 text-center text-gray-300">{settings.fontSize}%</span>
                                    <button
                                        onClick={() => setFontSize(settings.fontSize + 10)}
                                        className="w-10 h-10 rounded bg-gray-700 text-gray-300 hover:bg-gray-600"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            {/* Font Family */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">{t('Font')}</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {([
                                        { key: 'default', label: t('Default') },
                                        { key: 'literata', label: 'Literata' },
                                        { key: 'merriweather', label: 'Merriweather' },
                                        { key: 'lora', label: 'Lora' },
                                        { key: 'inter', label: 'Inter' },
                                        { key: 'opensans', label: 'Open Sans' },
                                        { key: 'dyslexic', label: 'Dyslexic' },
                                    ] as { key: FontFamily; label: string }[]).map(font => (
                                        <button
                                            key={font.key}
                                            onClick={() => setFontFamily(font.key)}
                                            className={`py-2 px-3 rounded border text-sm ${
                                                settings.fontFamily === font.key
                                                    ? 'border-indigo-500 bg-indigo-600/20 text-white'
                                                    : 'border-gray-600 text-gray-300 hover:border-gray-500'
                                            }`}
                                        >
                                            {font.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Line Height */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">{t('Line Height')}</label>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setLineHeight(settings.lineHeight - 0.1)}
                                        className="w-10 h-10 rounded bg-gray-700 text-gray-300 hover:bg-gray-600"
                                    >
                                        -
                                    </button>
                                    <span className="flex-1 text-center text-gray-300">{settings.lineHeight.toFixed(1)}</span>
                                    <button
                                        onClick={() => setLineHeight(settings.lineHeight + 0.1)}
                                        className="w-10 h-10 rounded bg-gray-700 text-gray-300 hover:bg-gray-600"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            {/* Margins */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">{t('Margins')}</label>
                                <div className="flex gap-2">
                                    {(['compact', 'normal', 'wide'] as Margins[]).map(margin => (
                                        <button
                                            key={margin}
                                            onClick={() => setMargins(margin)}
                                            className={`flex-1 py-2 rounded border text-sm ${
                                                settings.margins === margin
                                                    ? 'border-indigo-500 bg-indigo-600/20 text-white'
                                                    : 'border-gray-600 text-gray-300 hover:border-gray-500'
                                            }`}
                                        >
                                            {t(margin.charAt(0).toUpperCase() + margin.slice(1))}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Flow Mode */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">{t('Reading Mode')}</label>
                                <div className="flex gap-2">
                                    {(['paginated', 'scrolled'] as FlowMode[]).map(mode => (
                                        <button
                                            key={mode}
                                            onClick={() => setFlowMode(mode)}
                                            className={`flex-1 py-2 rounded border text-sm ${
                                                settings.flowMode === mode
                                                    ? 'border-indigo-500 bg-indigo-600/20 text-white'
                                                    : 'border-gray-600 text-gray-300 hover:border-gray-500'
                                            }`}
                                        >
                                            {mode === 'paginated' ? t('Paginated') : t('Scrolling')}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Text Selection */}
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-gray-300">{t('Text Selection')}</label>
                                <button
                                    onClick={() => setTextSelection(!settings.textSelection)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                        settings.textSelection ? 'bg-indigo-600' : 'bg-gray-600'
                                    }`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                            settings.textSelection ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                    />
                                </button>
                            </div>
                        </div>
                    </div>
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
                    {/* Percentage */}
                    <span className="text-sm text-gray-400 w-14 text-right flex-shrink-0">{progress.toFixed(1)}%</span>
                </div>
            )}
        </div>
    );
}
