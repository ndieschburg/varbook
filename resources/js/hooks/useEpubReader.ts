import { useEffect, useRef, useState, useCallback } from 'react';
import ePub, { Book, Rendition, NavItem } from 'epubjs';
import { usePositionSync, type ServerPosition } from './usePositionSync';
import { useReaderSettings, themeStyles, fontFamilies, marginValues } from './useReaderSettings';
import { useWakeLock } from './useWakeLock';
import { useFullscreenLock } from './useFullscreenLock';
import { getOfflineBook, saveBookOffline } from '@/services/offlineDb';
import type { PivotData } from '@/types/book';

interface UseEpubReaderOptions {
    bookId: number;
    epubUrl: string;
    containerRef: React.RefObject<HTMLDivElement | null>;
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
    locationsReady: boolean;
    toc: NavItem[];
    locationInfo: LocationInfo;
    searchResults: SearchResult[];
    isSearching: boolean;
    /** Non-null when waiting for locations to sync position from an external client */
    syncingPositionFrom: string | null;
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
            console.log(`[Varbook ${timestamp}] ${message}`, data);
        } else {
            console.log(`[Varbook ${timestamp}] ${message}`);
        }
    }, []);

    const bookRef = useRef<Book | null>(null);
    const renditionRef = useRef<Rendition | null>(null);
    const progressRef = useRef<number>(0); // Track progress in ref to avoid stale closure
    const locationsReadyRef = useRef<boolean>(false); // Track if locations are generated
    const skipSaveCountRef = useRef<number>(0); // Skip N saves after position restore
    // Only save position on explicit user navigation (not on resize, visibility change, etc.)
    const shouldSaveOnNextRelocateRef = useRef<boolean>(false);
    // Track last user-initiated CFI for restoration after Android app switcher resize
    const lastUserCfiRef = useRef<string | null>(null);
    // Deferred percentage navigation when locations aren't ready yet (cross-client sync)
    const pendingPercentageRef = useRef<number | null>(null);
    const [state, setState] = useState<EpubReaderState>({
        isLoading: true,
        error: null,
        progress: 0,
        locationsReady: false,
        toc: [],
        locationInfo: {
            currentPage: 0,
            totalPages: 0,
            currentChapter: '',
        },
        searchResults: [],
        isSearching: false,
        syncingPositionFrom: null,
    });

    const { settings, setTheme, setFontSize, setFontFamily, setLineHeight, setMargins, setTextSelection, setFullscreenLock } = useReaderSettings();

    /**
     * Extract pivot data from the current epub.js location.
     * Called by usePositionSync before each server sync.
     */
    const extractPivot = useCallback((): PivotData | null => {
        if (!renditionRef.current || !bookRef.current) return null;
        const location = renditionRef.current.currentLocation() as any;
        if (!location?.start) return null;

        const start = location.start;
        const spineItem = bookRef.current.spine.get(start.href);
        if (!spineItem) return null;

        const total = start.displayed?.total;
        const page = start.displayed?.page;
        if (!total || !page) return null;

        const spinePercent = total <= 1 ? 0 : (page - 1) / (total - 1);

        return {
            spine_index: spineItem.index,
            spine_href: spineItem.href,
            spine_percent: Math.round(spinePercent * 10000) / 10000,
            source: 'web',
        };
    }, []);

    /**
     * Navigate to a pivot position by displaying the spine item then advancing pages.
     * Used for cross-client sync (koreader → web).
     */
    const resolvePivot = useCallback(async (pivot: PivotData) => {
        debug('resolvePivot called', pivot);
        if (!renditionRef.current || !bookRef.current) return false;
        const book = bookRef.current;
        const rendition = renditionRef.current;

        // Find the spine item by index, fallback by href if mismatch
        let spineItem = book.spine.get(pivot.spine_index);
        if (!spineItem) {
            spineItem = book.spine.get(pivot.spine_href);
        } else if (pivot.spine_href && spineItem.href !== pivot.spine_href) {
            spineItem = book.spine.get(pivot.spine_href) || spineItem;
        }
        if (!spineItem) {
            debug('resolvePivot: spine item not found');
            return false;
        }

        debug('resolvePivot: navigating to', spineItem.href);

        // Navigate to start of spine item
        skipSaveCountRef.current = 100;
        await rendition.display(spineItem.href);

        // Wait for layout to settle before reading page count
        await new Promise(resolve => setTimeout(resolve, 100));
        const loc = rendition.currentLocation() as any;
        const totalPages = loc?.start?.displayed?.total || 1;
        const targetPage = Math.round(pivot.spine_percent * Math.max(1, totalPages - 1));

        debug('resolvePivot: advancing', { totalPages, targetPage, spinePercent: pivot.spine_percent });

        // Advance to target page
        for (let i = 0; i < targetPage; i++) {
            await rendition.next();
        }

        // Track final position
        const finalLoc = rendition.currentLocation() as any;
        if (finalLoc?.start?.cfi) {
            lastUserCfiRef.current = finalLoc.start.cfi;
        }
        skipSaveCountRef.current = 1;
        return true;
    }, [debug]);

    // Handle multi-device sync: when server has newer position from another device
    const handleMultiDeviceSync = useCallback((serverPosition: ServerPosition) => {
        debug('Multi-device sync available', serverPosition);

        if (!renditionRef.current || !bookRef.current) return;

        skipSaveCountRef.current = 1; // Skip next save to avoid overwriting

        // Use CFI when last sync was from web (same position format)
        const useCfi = serverPosition.lastSyncClient === 'web' && serverPosition.cfi;
        // Use pivot for cross-client sync (koreader → web)
        const usePivot = serverPosition.lastSyncClient !== 'web' && serverPosition.pivot;

        debug('Multi-device sync decision', {
            lastSyncClient: serverPosition.lastSyncClient,
            hasCfi: !!serverPosition.cfi,
            hasPivot: !!serverPosition.pivot,
            progress: serverPosition.progress,
            navigationMode: useCfi ? 'cfi' : usePivot ? 'pivot' : 'percentage',
        });

        if (useCfi) {
            debug('Navigating to server CFI', serverPosition.cfi);
            lastUserCfiRef.current = serverPosition.cfi;
            renditionRef.current.display(serverPosition.cfi!);
        } else if (usePivot) {
            resolvePivot(serverPosition.pivot!).then((ok) => {
                if (!ok) {
                    debug('Pivot resolve failed, falling back to percentage');
                    fallbackPercentageNavigation(serverPosition.progress);
                }
                setState(prev => ({ ...prev, syncingPositionFrom: null }));
            });
            setState(prev => ({ ...prev, syncingPositionFrom: serverPosition.lastSyncClient || 'external' }));
        } else if (serverPosition.progress > 0) {
            fallbackPercentageNavigation(serverPosition.progress);
        }
    }, [debug, resolvePivot]);

    // Fallback: navigate via global percentage (less precise but always works)
    const fallbackPercentageNavigation = useCallback((progress: number) => {
        if (!renditionRef.current || !bookRef.current) return;

        if (locationsReadyRef.current) {
            const cfi = bookRef.current.locations.cfiFromPercentage(progress / 100);
            if (cfi) {
                debug('Fallback: percentage -> CFI', { progress, cfi });
                lastUserCfiRef.current = cfi;
                renditionRef.current.display(cfi);
            }
        } else {
            debug('Fallback: deferring percentage navigation (locations not ready)', { progress });
            pendingPercentageRef.current = progress;
            setState(prev => ({ ...prev, syncingPositionFrom: 'external' }));
        }
    }, [debug]);

    const { loadPosition, savePosition, forceSync } = usePositionSync({
        bookId,
        onMultiDeviceSync: handleMultiDeviceSync,
        extractPivot,
    });

    // Prevent screen from sleeping while reading
    useWakeLock();

    // Fullscreen + orientation lock for mobile reading
    const { needsRestore: needsFullscreenRestore, restore: restoreFullscreen } = useFullscreenLock({
        enabled: settings.fullscreenLock,
        debug,
    });

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
                    flow: 'paginated',
                    allowScriptedContent: true,
                });
                renditionRef.current = rendition;

                // Swipe navigation for mobile - attach to epub.js iframe content
                let touchStartX = 0;
                let touchStartY = 0;
                const minSwipeDistance = 50;

                rendition.hooks.content.register((contents: any) => {
                    const doc = contents.document;

                    // Block browser navigation gestures via CSS
                    doc.body.style.touchAction = 'pan-y pinch-zoom';
                    doc.body.style.overscrollBehavior = 'none';

                    doc.addEventListener('touchstart', (e: TouchEvent) => {
                        touchStartX = e.touches[0].clientX;
                        touchStartY = e.touches[0].clientY;
                    }, { passive: true });

                    doc.addEventListener('touchend', (e: TouchEvent) => {
                        const deltaX = e.changedTouches[0].clientX - touchStartX;
                        const deltaY = e.changedTouches[0].clientY - touchStartY;
                        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
                            // Mark as user-initiated navigation to save position
                            shouldSaveOnNextRelocateRef.current = true;
                            if (deltaX < 0) {
                                rendition.next();
                            } else {
                                rendition.prev();
                            }
                        }
                    }, { passive: true });
                });

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

                // Navigate to saved position or start
                skipSaveCountRef.current = 1;
                const useSavedCfi = savedPosition?.cfi
                    && (savedPosition.source === 'local' || savedPosition.lastSyncClient === 'web');
                const useSavedPivot = savedPosition?.pivot
                    && savedPosition.lastSyncClient !== 'web'
                    && savedPosition.source === 'server';

                debug('Initial position decision', {
                    source: savedPosition?.source,
                    lastSyncClient: savedPosition?.lastSyncClient,
                    hasCfi: !!savedPosition?.cfi,
                    hasPivot: !!savedPosition?.pivot,
                    progress: savedPosition?.progress,
                    useSavedCfi,
                    useSavedPivot,
                });

                if (useSavedCfi && savedPosition?.cfi) {
                    debug(`Navigating to saved CFI: ${savedPosition.cfi}`);
                    lastUserCfiRef.current = savedPosition.cfi;
                    await rendition.display(savedPosition.cfi);
                } else if (useSavedPivot && savedPosition?.pivot) {
                    debug('Navigating via pivot from cross-client sync');
                    setState(prev => ({ ...prev, syncingPositionFrom: savedPosition.lastSyncClient || 'external' }));
                    await rendition.display(); // Display start first
                    // Resolve pivot after rendition is initialized
                    resolvePivot(savedPosition.pivot).then((ok) => {
                        if (!ok && savedPosition.progress > 0) {
                            debug('Pivot resolve failed on init, falling back to percentage');
                            pendingPercentageRef.current = savedPosition.progress;
                        }
                        setState(prev => ({ ...prev, syncingPositionFrom: null }));
                    });
                } else if (savedPosition && savedPosition.progress > 0) {
                    debug(`Navigating to saved percentage (lastSyncClient: ${savedPosition.lastSyncClient}): ${savedPosition.progress}%`);
                    await rendition.display();
                    pendingPercentageRef.current = savedPosition.progress;
                    if (savedPosition.lastSyncClient && savedPosition.lastSyncClient !== 'web') {
                        setState(prev => ({ ...prev, syncingPositionFrom: savedPosition.lastSyncClient }));
                    }
                } else {
                    debug('No saved position, starting from beginning');
                    await rendition.display();
                }

                // Generate locations in background (non-blocking)
                debug('Starting background location generation (1024 chars/location)...');
                book.locations.generate(1024).then(() => {
                    locationsReadyRef.current = true;
                    debug(`Locations generated: ${book.locations.length()} total locations`);

                    // Navigate to pending percentage from cross-client sync
                    if (pendingPercentageRef.current !== null && pendingPercentageRef.current > 0) {
                        const pendingPct = pendingPercentageRef.current;
                        pendingPercentageRef.current = null;
                        const targetCfi = book.locations.cfiFromPercentage(pendingPct / 100);
                        if (targetCfi) {
                            debug(`Deferred percentage navigation: ${pendingPct}% -> CFI: ${targetCfi}`);
                            skipSaveCountRef.current = 1;
                            lastUserCfiRef.current = targetCfi;
                            rendition.display(targetCfi);
                        }
                        setState(prev => ({ ...prev, syncingPositionFrom: null }));
                    }

                    // Recalculate and update progress now that locations are ready
                    const currentLocation = rendition.currentLocation() as any;
                    if (currentLocation?.start?.cfi) {
                        const accurateProgress = book.locations.percentageFromCfi(currentLocation.start.cfi) * 100;
                        const currentPage = Number(book.locations.locationFromCfi(currentLocation.start.cfi)) || 0;
                        const totalPages = book.locations.length();

                        debug('Updating progress after locations ready', {
                            previousProgress: progressRef.current.toFixed(5) + '%',
                            newProgress: accurateProgress.toFixed(5) + '%',
                            page: `${currentPage}/${totalPages}`,
                        });

                        progressRef.current = accurateProgress;
                        setState(prev => ({
                            ...prev,
                            progress: accurateProgress,
                            locationsReady: true,
                            locationInfo: {
                                ...prev.locationInfo,
                                currentPage,
                                totalPages,
                            },
                        }));
                    } else {
                        // No current location yet, just mark locations as ready
                        setState(prev => ({ ...prev, locationsReady: true }));
                    }
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
                        shouldSaveOnNextRelocateRef.current = false;
                        return;
                    }

                    // Only save on explicit user navigation (not resize, visibility change, etc.)
                    if (!shouldSaveOnNextRelocateRef.current) {
                        debug('Skipping save (not user-initiated navigation)');

                        // CRITICAL: If position changed due to resize (not user action),
                        // immediately restore to last known good position
                        // This fixes Android app switcher causing page jumps
                        if (lastUserCfiRef.current && currentCfi !== lastUserCfiRef.current) {
                            debug('Position drift detected! Restoring to last user CFI', {
                                driftedTo: currentCfi,
                                restoringTo: lastUserCfiRef.current,
                            });
                            skipSaveCountRef.current = 1; // Skip next relocated event from restore
                            rendition.display(lastUserCfiRef.current);
                        }
                        return;
                    }
                    shouldSaveOnNextRelocateRef.current = false;

                    debug('Saving position to server', { cfi: currentCfi, progress: progress.toFixed(5) + '%' });
                    lastUserCfiRef.current = currentCfi; // Track for restoration after resize
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
            // NOTE: We do NOT save position here - position is only saved on page turn
            // This avoids saving incorrect position when fullscreen changes
            bookRef.current?.destroy();
            // Reset refs for next book
            locationsReadyRef.current = false;
            skipSaveCountRef.current = 0;
            shouldSaveOnNextRelocateRef.current = false;
            // Clean up debug objects
            if ((window as any).epubBook) delete (window as any).epubBook;
            if ((window as any).epubRendition) delete (window as any).epubRendition;
        };
    }, [bookId, epubUrl, containerRef, debug]); // Don't include bookMeta or debugMode to avoid re-init loops

    // Apply all visual settings when they change
    useEffect(() => {
        applyTheme();
        applyTypography();
        applyTextSelection();
        // Force resize to apply margin changes properly (especially on mobile)
        if (renditionRef.current) {
            setTimeout(() => renditionRef.current?.resize(), 50);
        }
    }, [applyTheme, applyTypography, applyTextSelection]);

    // Expose/hide debug objects when debugMode changes
    useEffect(() => {
        if (debugMode && bookRef.current && renditionRef.current) {
            (window as any).epubBook = bookRef.current;
            (window as any).epubRendition = renditionRef.current;
            console.log('[Varbook Debug] epub.js objects exposed: epubBook, epubRendition');
            console.log('[Varbook Debug] Useful commands:');
            console.log('  epubRendition.currentLocation().start.cfi  // Get current CFI');
            console.log('  epubRendition.display("epubcfi(...)")      // Navigate to CFI');
            console.log('  epubBook.locations.percentageFromCfi(cfi)  // CFI to percentage');
        } else if (!debugMode) {
            if ((window as any).epubBook) delete (window as any).epubBook;
            if ((window as any).epubRendition) delete (window as any).epubRendition;
        }
    }, [debugMode]);

    // Navigation functions - all set shouldSaveOnNextRelocateRef to save position
    const nextPage = useCallback(() => {
        shouldSaveOnNextRelocateRef.current = true;
        renditionRef.current?.next();
    }, []);

    const prevPage = useCallback(() => {
        shouldSaveOnNextRelocateRef.current = true;
        renditionRef.current?.prev();
    }, []);

    const goTo = useCallback((href: string) => {
        shouldSaveOnNextRelocateRef.current = true;
        renditionRef.current?.display(href);
    }, []);

    const goToPercentage = useCallback((percentage: number) => {
        if (!bookRef.current || !renditionRef.current) return;
        shouldSaveOnNextRelocateRef.current = true;
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

    const goToSearchResult = useCallback((result: SearchResult) => {
        shouldSaveOnNextRelocateRef.current = true;
        renditionRef.current?.display(result.cfi);
    }, []);

    // Force push current position to server (bypasses debounce)
    const forceSyncPosition = useCallback(async (): Promise<boolean> => {
        if (!renditionRef.current) return false;
        const location = renditionRef.current.currentLocation() as any;
        const cfi = location?.start?.cfi;
        if (!cfi) return false;
        return forceSync(cfi, progressRef.current);
    }, [forceSync]);

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
        setTextSelection,
        setFullscreenLock,
        nextPage,
        prevPage,
        goTo,
        goToPercentage,
        search,
        goToSearchResult,
        forceSyncPosition,
        needsFullscreenRestore,
        restoreFullscreen,
    };
}

export type { SearchResult };
