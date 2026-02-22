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

interface EpubReaderState {
    isLoading: boolean;
    error: string | null;
    progress: number;
    toc: NavItem[];
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
    });

    const { settings, setTheme, setFontSize, setFontFamily, setLineHeight, setMargins, setFlowMode } = useReaderSettings();
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

                // Track location changes
                rendition.on('relocated', (location: any) => {
                    let progress = 0;
                    if (book.locations.length() > 0) {
                        progress = book.locations.percentageFromCfi(location.start.cfi) * 100;
                    } else {
                        progress = location.start.percentage * 100;
                    }

                    // Don't save progress if locations aren't ready and progress would be lower than saved
                    // This prevents overwriting real progress with 0 or incorrect values
                    const shouldSave = locationsReadyRef.current || progress >= initialProgressRef.current;

                    progressRef.current = progress; // Update ref for cleanup
                    setState(prev => ({ ...prev, progress }));

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
        nextPage,
        prevPage,
        goTo,
        goToPercentage,
    };
}
