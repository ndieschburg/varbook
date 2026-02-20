import { useEffect, useRef, useState, useCallback } from 'react';
import ePub, { Book, Rendition, NavItem } from 'epubjs';
import { usePositionSync } from './usePositionSync';
import { useReaderSettings, themeStyles, fontFamilies, marginValues } from './useReaderSettings';

interface UseEpubReaderOptions {
    bookId: number;
    epubUrl: string;
    containerRef: React.RefObject<HTMLDivElement>;
}

interface EpubReaderState {
    isLoading: boolean;
    error: string | null;
    progress: number;
    toc: NavItem[];
}

export function useEpubReader({ bookId, epubUrl, containerRef }: UseEpubReaderOptions) {
    const bookRef = useRef<Book | null>(null);
    const renditionRef = useRef<Rendition | null>(null);
    const [state, setState] = useState<EpubReaderState>({
        isLoading: true,
        error: null,
        progress: 0,
        toc: [],
    });

    const { settings, setTheme, setFontSize, setFontFamily, setLineHeight, setMargins, setFlowMode } = useReaderSettings();
    const { loadPosition, savePosition, flushSync } = usePositionSync({ bookId });

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

                // Fetch EPUB as ArrayBuffer
                const response = await fetch(epubUrl);
                if (!response.ok) {
                    throw new Error(`Failed to load EPUB: ${response.status}`);
                }
                const arrayBuffer = await response.arrayBuffer();

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

                // Generate locations for progress
                await book.ready;
                await book.locations.generate(1024);

                // Load TOC
                const navigation = await book.loaded.navigation;
                setState(prev => ({ ...prev, toc: navigation.toc }));

                // Apply settings
                applyTheme();
                applyTypography();

                // Load saved position
                const savedPosition = await loadPosition();
                if (savedPosition?.cfi) {
                    await rendition.display(savedPosition.cfi);
                } else {
                    await rendition.display();
                }

                // Track location changes
                rendition.on('relocated', (location: any) => {
                    let progress = 0;
                    if (book.locations.length() > 0) {
                        progress = book.locations.percentageFromCfi(location.start.cfi) * 100;
                    } else {
                        progress = location.start.percentage * 100;
                    }
                    setState(prev => ({ ...prev, progress }));
                    savePosition(location.start.cfi, progress);
                });

                setState(prev => ({ ...prev, isLoading: false }));
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
                flushSync(location.start.cfi, state.progress);
            }
            bookRef.current?.destroy();
        };
    }, [bookId, epubUrl, containerRef]); // Don't include settings.flowMode to avoid re-init on settings change

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
    };
}
