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
    /** Expose epub.js objects to window for console debugging */
    debugMode?: boolean;
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

export function useEpubReader({ bookId, epubUrl, containerRef, bookMeta, debugMode = false }: UseEpubReaderOptions) {
    // Use ref for debugMode to avoid re-initializing reader when settings load
    const debugModeRef = useRef(debugMode);
    debugModeRef.current = debugMode;

    // Debug logging helper - uses ref to always have latest value
    const debug = useCallback((message: string, data?: any) => {
        if (!debugModeRef.current) return;
        const timestamp = new Date().toISOString().substring(11, 23);
        if (data !== undefined) {
            console.log(`[BookShelf ${timestamp}] ${message}`, data);
        } else {
            console.log(`[BookShelf ${timestamp}] ${message}`);
        }
    }, []);

    const bookRef = useRef<Book | null>(null);
    const renditionRef = useRef<Rendition | null>(null);
    const progressRef = useRef<number>(0); // Track progress in ref to avoid stale closure
    const locationsReadyRef = useRef<boolean>(false); // Track if locations are generated
    const skipSaveCountRef = useRef<number>(0); // Skip N saves after position restore
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

                // Swipe navigation for mobile - attach to epub.js iframe content
                let touchStartX = 0;
                let touchStartY = 0;
                let touchStartedNearEdge = false;
                const minSwipeDistance = 50;
                const edgeThreshold = 30; // Pixels from edge to block browser gesture

                rendition.hooks.content.register((contents: any) => {
                    const doc = contents.document;

                    doc.addEventListener('touchstart', (e: TouchEvent) => {
                        touchStartX = e.touches[0].clientX;
                        touchStartY = e.touches[0].clientY;
                        // Check if touch started near left or right edge
                        const screenWidth = window.innerWidth;
                        touchStartedNearEdge = touchStartX < edgeThreshold || touchStartX > screenWidth - edgeThreshold;
                    }, { passive: true });

                    // Block browser back/forward gesture by preventing default on edge swipes
                    doc.addEventListener('touchmove', (e: TouchEvent) => {
                        if (touchStartedNearEdge) {
                            e.preventDefault();
                        }
                    }, { passive: false });

                    doc.addEventListener('touchend', (e: TouchEvent) => {
                        const deltaX = e.changedTouches[0].clientX - touchStartX;
                        const deltaY = e.changedTouches[0].clientY - touchStartY;
                        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
                            if (deltaX < 0) {
                                rendition.next();
                            } else {
                                rendition.prev();
                            }
                        }
                        touchStartedNearEdge = false;
                    }, { passive: true });
                });

                // Expose objects for console debugging when debug mode is enabled
                if (debugModeRef.current) {
                    (window as any).epubBook = book;
                    (window as any).epubRendition = rendition;
                    console.log('[BookShelf Debug] epub.js objects exposed: epubBook, epubRendition');
                    console.log('[BookShelf Debug] Useful commands:');
                    console.log('  epubRendition.currentLocation().start.cfi  // Get current CFI');
                    console.log('  epubRendition.display("epubcfi(...)")      // Navigate to CFI');
                    console.log('  epubBook.locations.percentageFromCfi(cfi)  // CFI to percentage');
                }

                debug('Book ready, waiting for book.ready promise...');
                await book.ready;
                debug('Book initialized');

                // Load TOC
                const navigation = await book.loaded.navigation;
                setState(prev => ({ ...prev, toc: navigation.toc }));

                // Apply settings
                applyTheme();
                applyTypography();
                applyTextSelection();

                // Load saved position from server
                debug('Loading saved position from server...');
                const savedPosition = await loadPosition();
                debug('Server position loaded', savedPosition);

                // Helper to compare two CFIs and determine if we need to advance
                // Returns: -1 if cfiA < cfiB, 0 if equal, 1 if cfiA > cfiB
                const compareCfi = (cfiA: string, cfiB: string): number => {
                    // Extract the path portion after the last "!"
                    // e.g., "epubcfi(/6/100!/4[x9782207138595-51]/2/12/1:0)" -> "/4[x9782207138595-51]/2/12/1:0"
                    const pathA = cfiA.split('!').pop() || '';
                    const pathB = cfiB.split('!').pop() || '';

                    // Extract all numbers from the path
                    const numsA = pathA.match(/\d+/g)?.map(Number) || [];
                    const numsB = pathB.match(/\d+/g)?.map(Number) || [];

                    // Compare number by number
                    const maxLen = Math.max(numsA.length, numsB.length);
                    for (let i = 0; i < maxLen; i++) {
                        const a = numsA[i] ?? 0;
                        const b = numsB[i] ?? 0;
                        if (a < b) return -1;
                        if (a > b) return 1;
                    }
                    return 0;
                };

                // Navigate to saved CFI or start
                if (savedPosition?.cfi) {
                    debug(`Navigating to saved CFI: ${savedPosition.cfi}`);
                    debug(`Saved progress: ${savedPosition.progress?.toFixed(5)}%`);
                    skipSaveCountRef.current = 1;
                    await rendition.display(savedPosition.cfi);
                    let afterLocation = rendition.currentLocation();
                    debug('After display() - actual CFI:', afterLocation?.start?.cfi);

                    // Check if target CFI is on the current page (between start and end)
                    const isTargetOnCurrentPage = (location: any, targetCfi: string): boolean => {
                        const startCfi = location?.start?.cfi;
                        const endCfi = location?.end?.cfi;
                        if (!startCfi || !endCfi) return false;

                        const startComparison = compareCfi(targetCfi, startCfi);
                        const endComparison = compareCfi(targetCfi, endCfi);

                        // Target is on current page if: start <= target <= end
                        return startComparison >= 0 && endComparison <= 0;
                    };

                    // Check if we need to advance pages to reach the saved position
                    if (afterLocation?.start?.cfi && savedPosition.cfi !== afterLocation.start.cfi) {
                        // First check if target is already on the current page
                        if (isTargetOnCurrentPage(afterLocation, savedPosition.cfi)) {
                            debug('Target CFI is on current page (between start and end) - no advance needed');
                            debug('Page range:', { start: afterLocation.start.cfi, end: afterLocation.end?.cfi, target: savedPosition.cfi });
                        } else {
                            const comparison = compareCfi(afterLocation.start.cfi, savedPosition.cfi);
                            debug('CFI comparison:', { current: afterLocation.start.cfi, target: savedPosition.cfi, result: comparison });

                            if (comparison < 0) {
                                // Current position is BEFORE target - need to advance
                                debug('Position drift detected - advancing pages to reach target...');
                                const maxIterations = 20; // Safety limit
                                let iterations = 0;

                                while (iterations < maxIterations) {
                                    iterations++;
                                    skipSaveCountRef.current++; // Skip save for each advance

                                    // Wait for next page
                                    await new Promise<void>((resolve) => {
                                        rendition.once('relocated', () => resolve());
                                        rendition.next();
                                    });

                                    afterLocation = rendition.currentLocation();
                                    const currentCfi = afterLocation?.start?.cfi;
                                    debug(`Advance ${iterations}: CFI = ${currentCfi}`);

                                    if (!currentCfi) break;

                                    // Check if target is now on the current page
                                    if (isTargetOnCurrentPage(afterLocation, savedPosition.cfi)) {
                                        debug(`Target found on page after ${iterations} advance(s)`);
                                        break;
                                    }

                                    // Or if we've passed the target completely
                                    const newComparison = compareCfi(currentCfi, savedPosition.cfi);
                                    if (newComparison > 0) {
                                        debug(`Warning: Passed target after ${iterations} advance(s), going back...`);
                                        // We went too far, go back one page
                                        skipSaveCountRef.current++;
                                        await new Promise<void>((resolve) => {
                                            rendition.once('relocated', () => resolve());
                                            rendition.prev();
                                        });
                                        break;
                                    }
                                }

                                if (iterations >= maxIterations) {
                                    debug('Warning: Hit max iterations, stopping advance');
                                }
                            } else {
                                debug('CFI match: ✗ NO (but current is ahead of target, not advancing)');
                            }
                        }
                    } else if (savedPosition.cfi === afterLocation?.start?.cfi) {
                        debug('CFI match: ✓ YES');
                    }
                } else {
                    debug('No saved position, starting from beginning');
                    skipSaveCountRef.current = 1;
                    await rendition.display();
                }

                // Generate locations in background (non-blocking)
                debug('Starting background location generation (1024 chars/location)...');
                book.locations.generate(1024).then(() => {
                    locationsReadyRef.current = true;
                    debug(`Locations generated: ${book.locations.length()} total locations`);
                });

                // Mark as loaded - user can start reading
                setState(prev => ({ ...prev, isLoading: false }));

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
                    const currentCfi = location.start.cfi;
                    let progress = 0;
                    let currentPage = 0;
                    let totalPages = 0;

                    if (locationsReadyRef.current && book.locations.length() > 0) {
                        progress = book.locations.percentageFromCfi(currentCfi) * 100;
                        currentPage = book.locations.locationFromCfi(currentCfi) || 0;
                        totalPages = book.locations.length();
                    } else {
                        progress = location.start.percentage * 100;
                    }

                    const currentChapter = findCurrentChapter(location);

                    debug('relocated event', {
                        cfi: currentCfi,
                        progress: progress.toFixed(5) + '%',
                        page: `${currentPage}/${totalPages}`,
                        chapter: currentChapter,
                        locationsReady: locationsReadyRef.current,
                    });

                    progressRef.current = progress;
                    setState(prev => ({
                        ...prev,
                        progress,
                        locationInfo: {
                            currentPage,
                            totalPages,
                            currentChapter,
                        },
                    }));

                    // Skip save if we just restored a position (avoids overwriting server value)
                    if (skipSaveCountRef.current > 0) {
                        debug(`Skipping save (skipSaveCount: ${skipSaveCountRef.current})`);
                        skipSaveCountRef.current--;
                        return;
                    }

                    debug('Saving position to server', { cfi: currentCfi, progress: progress.toFixed(5) + '%' });
                    savePosition(currentCfi, progress);
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
            debug('Cleanup - destroying reader');
            const location = renditionRef.current?.currentLocation();
            if (location?.start?.cfi) {
                debug('Cleanup - flushing final position', {
                    cfi: location.start.cfi,
                    progress: progressRef.current.toFixed(5) + '%',
                });
                // Use ref to get current progress (avoids stale closure)
                flushSync(location.start.cfi, progressRef.current);
            }
            bookRef.current?.destroy();
            // Reset refs for next book
            locationsReadyRef.current = false;
            skipSaveCountRef.current = 0;
            // Clean up debug objects
            if ((window as any).epubBook) delete (window as any).epubBook;
            if ((window as any).epubRendition) delete (window as any).epubRendition;
        };
    }, [bookId, epubUrl, containerRef, debug]); // Don't include bookMeta or debugMode to avoid re-init loops

    // Apply theme when it changes
    useEffect(() => {
        applyTheme();
    }, [applyTheme]);

    // Apply typography when it changes
    useEffect(() => {
        applyTypography();
        // Force resize to apply margin changes properly (especially on mobile)
        if (renditionRef.current) {
            // Small delay to ensure styles are applied first
            setTimeout(() => {
                renditionRef.current?.resize();
            }, 50);
        }
    }, [applyTypography]);

    // Apply text selection when it changes
    useEffect(() => {
        applyTextSelection();
    }, [applyTextSelection]);

    // Expose/hide debug objects when debugMode changes
    useEffect(() => {
        if (debugMode && bookRef.current && renditionRef.current) {
            (window as any).epubBook = bookRef.current;
            (window as any).epubRendition = renditionRef.current;
            console.log('[BookShelf Debug] epub.js objects exposed: epubBook, epubRendition');
            console.log('[BookShelf Debug] Useful commands:');
            console.log('  epubRendition.currentLocation().start.cfi  // Get current CFI');
            console.log('  epubRendition.display("epubcfi(...)")      // Navigate to CFI');
            console.log('  epubBook.locations.percentageFromCfi(cfi)  // CFI to percentage');
        } else if (!debugMode) {
            if ((window as any).epubBook) delete (window as any).epubBook;
            if ((window as any).epubRendition) delete (window as any).epubRendition;
        }
    }, [debugMode]);

    // Sync position when app returns to foreground or save when going to background
    useEffect(() => {
        const handleVisibilityChange = async () => {
            if (!renditionRef.current || !bookRef.current) return;

            if (document.visibilityState === 'hidden') {
                // Page going to background - save progress immediately
                const location = renditionRef.current.currentLocation();
                if (location?.start?.cfi) {
                    debug('Page hidden - flushing position', {
                        cfi: location.start.cfi,
                        progress: progressRef.current.toFixed(5) + '%',
                    });
                    flushSync(location.start.cfi, progressRef.current);
                }
                return;
            }

            // Page becoming visible - check if server has newer position
            if (document.visibilityState === 'visible' && navigator.onLine && locationsReadyRef.current) {
                debug('Page visible - checking server for newer position...');
                try {
                    const serverPosition = await loadPosition();
                    if (!serverPosition) {
                        debug('No server position found');
                        return;
                    }

                    const currentProgress = progressRef.current;
                    debug('Comparing positions', {
                        server: serverPosition.progress?.toFixed(5) + '%',
                        local: currentProgress.toFixed(5) + '%',
                        diff: ((serverPosition.progress || 0) - currentProgress).toFixed(5) + '%',
                    });

                    // Only sync if server progress is significantly ahead (avoid micro-jumps)
                    if (serverPosition.progress > currentProgress + 0.001) {
                        debug('Server is ahead - syncing position', { serverCfi: serverPosition.cfi });
                        skipSaveCountRef.current = 1; // Skip next save
                        if (serverPosition.cfi) {
                            renditionRef.current.display(serverPosition.cfi);
                        } else if (locationsReadyRef.current) {
                            const cfi = bookRef.current.locations.cfiFromPercentage(serverPosition.progress / 100);
                            if (cfi) {
                                debug('Generated CFI from percentage', { cfi });
                                renditionRef.current.display(cfi);
                            }
                        }
                    } else {
                        debug('Local position is current or ahead - no sync needed');
                    }
                } catch (error) {
                    console.error('Failed to sync position on visibility change:', error);
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [loadPosition, flushSync, debug]);

    // Save progress on page unload (pagehide is more reliable than beforeunload on mobile)
    useEffect(() => {
        const handlePageHide = () => {
            if (!renditionRef.current) return;
            const location = renditionRef.current.currentLocation();
            if (location?.start?.cfi) {
                debug('pagehide - flushing position', {
                    cfi: location.start.cfi,
                    progress: progressRef.current.toFixed(5) + '%',
                });
                flushSync(location.start.cfi, progressRef.current);
            }
        };

        window.addEventListener('pagehide', handlePageHide);
        return () => window.removeEventListener('pagehide', handlePageHide);
    }, [flushSync, debug]);

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
