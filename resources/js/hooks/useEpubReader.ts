import { useEffect, useRef, useState, useCallback } from 'react';
import ePub, { Book, Rendition, NavItem } from 'epubjs';
import { usePositionSync } from './usePositionSync';
import { useReaderSettings, themeStyles, fontFamilies, marginValues } from './useReaderSettings';
import { useWakeLock } from './useWakeLock';
import { getOfflineBook, saveBookOffline } from '@/services/offlineDb';

interface UseEpubReaderOptions {
    bookId: number;
    epubUrl: string;
    containerRef: React.RefObject<HTMLDivElement>;
    /** Book metadata for auto-caching */
    bookMeta?: {
        title: string;
        author: string;
        coverUrl: string | null;
    };
}

interface SearchResult {
    cfi: string;
    excerpt: string;
    chapter?: string;
}

interface LocationInfo {
    currentPage: number;
    totalPages: number;
    currentChapter: string;
}

interface EpubReaderState {
    isLoading: boolean;
    error: string | null;
    progress: number;
    toc: NavItem[];
    locationInfo: LocationInfo;
    searchResults: SearchResult[];
    isSearching: boolean;
}

export function useEpubReader({ bookId, epubUrl, containerRef, bookMeta }: UseEpubReaderOptions) {
    const bookRef = useRef<Book | null>(null);
    const renditionRef = useRef<Rendition | null>(null);
    const progressRef = useRef<number>(0); // Track progress in ref to avoid stale closure
    const locationsReadyRef = useRef<boolean>(false); // Track if locations are generated
    const initialProgressRef = useRef<number>(0); // Track loaded progress to avoid overwriting
    const [state, setState] = useState<EpubReaderState>({
        isLoading: true,
        error: null,
        progress: 0,
        toc: [],
        locationInfo: {
            currentPage: 0,
            totalPages: 0,
            currentChapter: '',
        },
        searchResults: [],
        isSearching: false,
    });

    const { settings, setTheme, setFontSize, setFontFamily, setLineHeight, setMargins, setFlowMode, setTextSelection } = useReaderSettings();
    const { loadPosition, savePosition, flushSync } = usePositionSync({ bookId });

    // Prevent screen from sleeping while reading
    useWakeLock();

    // Apply theme to rendition
    const applyTheme = useCallback(() => {
        if (!renditionRef.current) return;
        const style = themeStyles[settings.theme];
        renditionRef.current.themes.default({ body: style });
    }, [settings.theme]);

    // Apply typography settings
    const applyTypography = useCallback(() => {
        if (!renditionRef.current) return;
        renditionRef.current.themes.fontSize(`${settings.fontSize}%`);
        renditionRef.current.themes.font(fontFamilies[settings.fontFamily]);
        renditionRef.current.themes.override('line-height', String(settings.lineHeight));
        const margin = marginValues[settings.margins];
        renditionRef.current.themes.override('padding', `${margin.top}px ${margin.side}px`);
    }, [settings.fontSize, settings.fontFamily, settings.lineHeight, settings.margins]);

    // Apply text selection setting
    const applyTextSelection = useCallback(() => {
        if (!renditionRef.current) return;
        const userSelect = settings.textSelection ? 'text' : 'none';
        renditionRef.current.themes.override('user-select', userSelect);
        renditionRef.current.themes.override('-webkit-user-select', userSelect);
    }, [settings.textSelection]);

    // Initialize reader
    useEffect(() => {
        if (!containerRef.current) return;

        const initReader = async () => {
            try {
                setState(prev => ({ ...prev, isLoading: true, error: null }));

                let arrayBuffer: ArrayBuffer;

                // Try to load from IndexedDB first (offline mode)
                const offlineBook = await getOfflineBook(bookId);
                if (offlineBook) {
                    arrayBuffer = offlineBook.epubData;
                } else {
                    // Fetch EPUB from network
                    const response = await fetch(epubUrl, {
                        credentials: 'include', // Include cookies for authentication
                    });
                    if (!response.ok) {
                        throw new Error(`Failed to load EPUB: ${response.status}`);
                    }
                    arrayBuffer = await response.arrayBuffer();

                    // Auto-cache to IndexedDB for faster subsequent loads
                    if (bookMeta) {
                        saveBookOffline(
                            bookId,
                            bookMeta.title,
                            bookMeta.author,
                            bookMeta.coverUrl,
                            arrayBuffer
                        ).catch(() => {}); // Silently ignore cache errors
                    }
                }

                // Create book
                const book = ePub(arrayBuffer);
                bookRef.current = book;

                // Create rendition
                const rendition = book.renderTo(containerRef.current!, {
                    width: '100%',
                    height: '100%',
                    spread: 'none',
                    flow: settings.flowMode,
                    allowScriptedContent: true,
                });
                renditionRef.current = rendition;

                await book.ready;

                // Load TOC
                const navigation = await book.loaded.navigation;
                setState(prev => ({ ...prev, toc: navigation.toc }));

                // Apply settings
                applyTheme();
                applyTypography();
                applyTextSelection();

                // Display book immediately (fast)
                const savedPosition = await loadPosition();
                if (savedPosition?.cfi) {
                    await rendition.display(savedPosition.cfi);
                } else {
                    await rendition.display();
                }

                // Mark as loaded - user can start reading
                setState(prev => ({ ...prev, isLoading: false }));

                // Store initial progress to avoid overwriting with 0
                if (savedPosition?.progress) {
                    initialProgressRef.current = savedPosition.progress;
                }

                // Generate locations in background (non-blocking)
                book.locations.generate(2048).then(() => {
                    locationsReadyRef.current = true;
                    // If we had a percentage fallback, navigate now that locations are ready
                    if (!savedPosition?.cfi && savedPosition?.progress && savedPosition.progress > 0) {
                        const cfi = book.locations.cfiFromPercentage(savedPosition.progress / 100);
                        if (cfi) {
                            rendition.display(cfi);
                        }
                    }
                });

                // Helper to find current chapter from location
                const findCurrentChapter = (loc: any): string => {
                    const toc = navigation.toc;
                    let currentChapter = '';
                    const currentHref = loc?.start?.href;

                    if (!currentHref) return '';

                    const searchToc = (items: NavItem[]): void => {
                        for (const item of items) {
                            // Check if this TOC item's href matches current location
                            if (item.href && currentHref.includes(item.href.split('#')[0])) {
                                currentChapter = item.label;
                            }
                            if (item.subitems && item.subitems.length > 0) {
                                searchToc(item.subitems);
                            }
                        }
                    };

                    searchToc(toc);
                    return currentChapter.trim();
                };

                // Track location changes
                rendition.on('relocated', (location: any) => {
                    let progress = 0;
                    let currentPage = 0;
                    let totalPages = 0;

                    if (book.locations.length() > 0) {
                        progress = book.locations.percentageFromCfi(location.start.cfi) * 100;
                        currentPage = book.locations.locationFromCfi(location.start.cfi) || 0;
                        totalPages = book.locations.length();
                    } else {
                        progress = location.start.percentage * 100;
                    }

                    const currentChapter = findCurrentChapter(location);

                    // Don't save progress if locations aren't ready and progress would be lower than saved
                    // This prevents overwriting real progress with 0 or incorrect values
                    const shouldSave = locationsReadyRef.current || progress >= initialProgressRef.current;

                    progressRef.current = progress; // Update ref for cleanup
                    setState(prev => ({
                        ...prev,
                        progress,
                        locationInfo: {
                            currentPage,
                            totalPages,
                            currentChapter,
                        },
                    }));

                    if (shouldSave) {
                        savePosition(location.start.cfi, progress);
                    }
                });
            } catch (error) {
                setState(prev => ({
                    ...prev,
                    isLoading: false,
                    error: error instanceof Error ? error.message : 'Failed to load book',
                }));
            }
        };

        initReader();

        // Cleanup
        return () => {
            const location = renditionRef.current?.currentLocation();
            if (location?.start?.cfi) {
                // Use ref to get current progress (avoids stale closure)
                flushSync(location.start.cfi, progressRef.current);
            }
            bookRef.current?.destroy();
            // Reset refs for next book
            locationsReadyRef.current = false;
            initialProgressRef.current = 0;
        };
    }, [bookId, epubUrl, containerRef]); // Don't include bookMeta to avoid re-init loops

    // Apply theme when it changes
    useEffect(() => {
        applyTheme();
    }, [applyTheme]);

    // Apply typography when it changes
    useEffect(() => {
        applyTypography();
    }, [applyTypography]);

    // Apply text selection when it changes
    useEffect(() => {
        applyTextSelection();
    }, [applyTextSelection]);

    // Sync position when app returns to foreground or save when going to background
    useEffect(() => {
        const handleVisibilityChange = async () => {
            if (!renditionRef.current || !bookRef.current) return;

            if (document.visibilityState === 'hidden') {
                // Page going to background - save progress immediately
                const location = renditionRef.current.currentLocation();
                if (location?.start?.cfi) {
                    flushSync(location.start.cfi, progressRef.current);
                }
                return;
            }

            // Page becoming visible - check if server has newer position
            if (document.visibilityState === 'visible' && navigator.onLine) {
                try {
                    const serverPosition = await loadPosition();
                    if (!serverPosition) return;

                    const currentProgress = progressRef.current;

                    // Only sync if server progress is ahead
                    if (serverPosition.progress > currentProgress) {
                        // Navigate to server position
                        if (serverPosition.cfi) {
                            renditionRef.current.display(serverPosition.cfi);
                        } else if (serverPosition.progress > 0 && locationsReadyRef.current) {
                            // Fallback to percentage if no CFI
                            const cfi = bookRef.current.locations.cfiFromPercentage(serverPosition.progress / 100);
                            if (cfi) {
                                renditionRef.current.display(cfi);
                            }
                        }
                        // Update initial progress ref to prevent saving lower values
                        initialProgressRef.current = serverPosition.progress;
                    }
                } catch (error) {
                    console.error('Failed to sync position on visibility change:', error);
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [loadPosition, flushSync]);

    // Save progress on page unload (pagehide is more reliable than beforeunload on mobile)
    useEffect(() => {
        const handlePageHide = () => {
            if (!renditionRef.current) return;
            const location = renditionRef.current.currentLocation();
            if (location?.start?.cfi) {
                flushSync(location.start.cfi, progressRef.current);
            }
        };

        window.addEventListener('pagehide', handlePageHide);
        return () => window.removeEventListener('pagehide', handlePageHide);
    }, [flushSync]);

    // Navigation functions
    const nextPage = useCallback(() => {
        renditionRef.current?.next();
    }, []);

    const prevPage = useCallback(() => {
        renditionRef.current?.prev();
    }, []);

    const goTo = useCallback((href: string) => {
        renditionRef.current?.display(href);
    }, []);

    const goToPercentage = useCallback((percentage: number) => {
        if (!bookRef.current || !renditionRef.current) return;
        const clamped = Math.max(0, Math.min(100, percentage));
        const cfi = bookRef.current.locations.cfiFromPercentage(clamped / 100);
        if (cfi) {
            renditionRef.current.display(cfi);
        }
    }, []);

    // Search in book
    const search = useCallback(async (query: string) => {
        if (!bookRef.current || !query.trim()) {
            setState(prev => ({ ...prev, searchResults: [], isSearching: false }));
            return;
        }

        setState(prev => ({ ...prev, isSearching: true }));

        try {
            const book = bookRef.current;
            const results: SearchResult[] = [];

            // Search through each spine item (chapter)
            await Promise.all(
                book.spine.spineItems.map(async (item: any) => {
                    const doc = await item.load(book.load.bind(book));
                    const textContent = doc.body?.textContent || '';

                    // Find all occurrences
                    const lowerQuery = query.toLowerCase();
                    const lowerText = textContent.toLowerCase();
                    let pos = 0;

                    while ((pos = lowerText.indexOf(lowerQuery, pos)) !== -1) {
                        // Get excerpt around match
                        const start = Math.max(0, pos - 30);
                        const end = Math.min(textContent.length, pos + query.length + 30);
                        let excerpt = textContent.slice(start, end);

                        if (start > 0) excerpt = '...' + excerpt;
                        if (end < textContent.length) excerpt = excerpt + '...';

                        // Generate CFI for this position
                        const cfi = item.cfiFromElement(doc.body);

                        results.push({
                            cfi: cfi || item.href,
                            excerpt: excerpt.replace(/\s+/g, ' ').trim(),
                            chapter: item.idref,
                        });

                        pos += query.length;

                        // Limit results per chapter to avoid too many
                        if (results.length >= 50) break;
                    }

                    item.unload();
                })
            );

            setState(prev => ({ ...prev, searchResults: results.slice(0, 50), isSearching: false }));
        } catch (error) {
            console.error('Search error:', error);
            setState(prev => ({ ...prev, searchResults: [], isSearching: false }));
        }
    }, []);

    const clearSearch = useCallback(() => {
        setState(prev => ({ ...prev, searchResults: [], isSearching: false }));
    }, []);

    const goToSearchResult = useCallback((result: SearchResult) => {
        if (result.cfi.startsWith('epubcfi')) {
            renditionRef.current?.display(result.cfi);
        } else {
            // Fallback to href if CFI not available
            renditionRef.current?.display(result.cfi);
        }
    }, []);

    // Keyboard navigation
    useEffect(() => {
        const handleKeydown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight' || e.key === ' ') {
                e.preventDefault();
                nextPage();
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                prevPage();
            }
        };

        document.addEventListener('keydown', handleKeydown);
        return () => document.removeEventListener('keydown', handleKeydown);
    }, [nextPage, prevPage]);

    // Swipe navigation for mobile
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        let touchStartX = 0;
        let touchStartY = 0;
        let touchEndX = 0;
        let touchEndY = 0;

        const minSwipeDistance = 50; // Minimum distance for a swipe

        const handleTouchStart = (e: TouchEvent) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        };

        const handleTouchEnd = (e: TouchEvent) => {
            touchEndX = e.changedTouches[0].clientX;
            touchEndY = e.changedTouches[0].clientY;

            const deltaX = touchEndX - touchStartX;
            const deltaY = touchEndY - touchStartY;

            // Only trigger swipe if horizontal movement is greater than vertical
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
                if (deltaX < 0) {
                    // Swipe left → next page
                    nextPage();
                } else {
                    // Swipe right → previous page
                    prevPage();
                }
            }
        };

        container.addEventListener('touchstart', handleTouchStart, { passive: true });
        container.addEventListener('touchend', handleTouchEnd, { passive: true });

        return () => {
            container.removeEventListener('touchstart', handleTouchStart);
            container.removeEventListener('touchend', handleTouchEnd);
        };
    }, [containerRef, nextPage, prevPage]);

    return {
        ...state,
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
    };
}

export type { SearchResult };
