import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { SkipBackIcon, SkipForwardIcon, ClockIcon } from '@/components/icons';

interface LocationInfo {
    currentPage: number;
    totalPages: number;
    currentChapter: string;
    chapterPagesLeft: number;
    chapterPagesTotal: number;
    chapterCurrentPage: number;
}

interface ReaderStatusBarProps {
    progress: number;
    locationsReady: boolean;
    locationInfo: LocationInfo;
    onPrevChapter: () => void;
    onNextChapter: () => void;
}

/**
 * KOReader-inspired status bar for the EPUB reader.
 *
 * Displays: prev chapter | page/total | progress% | ->| pages left in chapter | estimated time | clock | next chapter
 *
 * @example
 * <ReaderStatusBar
 *     progress={42.5}
 *     locationsReady={true}
 *     locationInfo={locationInfo}
 *     onPrevChapter={goToPrevChapter}
 *     onNextChapter={goToNextChapter}
 * />
 */
export function ReaderStatusBar({
    progress,
    locationsReady,
    locationInfo,
    onPrevChapter,
    onNextChapter,
}: ReaderStatusBarProps) {
    const { t } = useTranslation();
    const [currentTime, setCurrentTime] = useState(new Date());

    // Update clock every 30 seconds
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 30000);
        return () => clearInterval(timer);
    }, []);

    const timeString = currentTime.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });

    // Estimate remaining reading time based on ~1 min per epub.js location (1024 chars)
    const estimatedTimeLeft = useMemo(() => {
        if (!locationsReady || locationInfo.totalPages === 0) return null;
        const pagesLeft = locationInfo.totalPages - locationInfo.currentPage;
        const totalMinutes = pagesLeft; // ~1 min per location
        if (totalMinutes < 1) return t('< 1 min');
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        if (hours > 0) {
            return `${hours}h${String(minutes).padStart(2, '0')}`;
        }
        return `${minutes} min`;
    }, [locationsReady, locationInfo.totalPages, locationInfo.currentPage, t]);

    return (
        <div className="flex-shrink-0 bg-gray-900/95 backdrop-blur-sm border-t border-gray-700/50 z-20">
            <div className="h-11 flex items-center justify-between px-1 text-sm text-gray-400 font-mono select-none">
                {/* Previous chapter button */}
                <button
                    onClick={(e) => { e.stopPropagation(); onPrevChapter(); }}
                    className="flex-shrink-0 p-1.5 text-gray-500 hover:text-gray-300 active:text-white transition-colors"
                    title={t('Previous chapter')}
                >
                    <SkipBackIcon className="h-4 w-4" />
                </button>

                {/* Info items */}
                <div className="flex-1 flex items-center justify-center gap-1.5 sm:gap-4 min-w-0 overflow-hidden text-xs sm:text-sm">
                    {/* Page counter */}
                    {locationsReady && locationInfo.totalPages > 0 ? (
                        <span className="flex-shrink-0 text-gray-300 tabular-nums">
                            {locationInfo.currentPage}
                            <span className="text-gray-600 mx-0.5">/</span>
                            {locationInfo.totalPages}
                        </span>
                    ) : (
                        <span className="flex-shrink-0">
                            <LoadingDots />
                        </span>
                    )}

                    {/* Separator */}
                    <span className="text-gray-700 flex-shrink-0">|</span>

                    {/* Progress percentage */}
                    <span className="flex-shrink-0 text-gray-300 tabular-nums">
                        {locationsReady ? (
                            <>
                                <span className="text-indigo-400 font-medium">{progress.toFixed(1)}</span>
                                <span className="text-gray-500">%</span>
                            </>
                        ) : (
                            <LoadingDots />
                        )}
                    </span>

                    {/* Separator */}
                    <span className="text-gray-700 flex-shrink-0">|</span>

                    {/* Pages left in chapter (KOReader arrow style) */}
                    {locationInfo.chapterPagesTotal > 0 ? (
                        <span className="flex-shrink-0 flex items-center gap-1 tabular-nums">
                            <span className="text-gray-500 text-xs">{'\u21E5'}</span>
                            <span className="text-gray-300">{locationInfo.chapterPagesLeft}</span>
                        </span>
                    ) : (
                        <span className="flex-shrink-0">
                            <LoadingDots />
                        </span>
                    )}

                    {/* Separator */}
                    <span className="text-gray-700 flex-shrink-0">|</span>

                    {/* Estimated time remaining */}
                    <span className="flex-shrink-0 flex items-center gap-1 text-gray-400 tabular-nums">
                        <svg className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                        </svg>
                        {estimatedTimeLeft ? (
                            <span>{estimatedTimeLeft}</span>
                        ) : (
                            <LoadingDots />
                        )}
                    </span>

                    {/* Separator */}
                    <span className="text-gray-700 flex-shrink-0">|</span>

                    {/* Current time */}
                    <span className="flex-shrink-0 flex items-center gap-1 tabular-nums">
                        <ClockIcon className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                        <span className="text-gray-300">{timeString}</span>
                    </span>
                </div>

                {/* Next chapter button */}
                <button
                    onClick={(e) => { e.stopPropagation(); onNextChapter(); }}
                    className="flex-shrink-0 p-1.5 text-gray-500 hover:text-gray-300 active:text-white transition-colors"
                    title={t('Next chapter')}
                >
                    <SkipForwardIcon className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}

/**
 * Animated loading dots indicator for status bar items.
 */
function LoadingDots() {
    return (
        <span className="inline-flex gap-0.5">
            <span className="w-1 h-1 bg-gray-600 rounded-full animate-pulse" />
            <span className="w-1 h-1 bg-gray-600 rounded-full animate-pulse [animation-delay:150ms]" />
            <span className="w-1 h-1 bg-gray-600 rounded-full animate-pulse [animation-delay:300ms]" />
        </span>
    );
}
