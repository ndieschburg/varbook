import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Book } from '@/types';
import { CloudDownloadIcon, CloudOfflineIcon, BookIcon, ClockIcon, CheckIcon } from '@/components/icons';
import { useBookOfflineStatus } from '@/hooks/useBookOfflineStatus';

interface BookCardProps {
    book: Book;
    variant?: 'grid' | 'reading';
}

export function BookCard({ book, variant = 'grid' }: BookCardProps) {
    const { t } = useTranslation();
    const { isOffline, isChecking, downloadState, downloadForOffline, removeFromOffline } =
        useBookOfflineStatus({
            bookId: book.id,
            title: book.title,
            author: book.author,
            coverUrl: book.cover_url,
        });

    const handleOfflineToggle = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (isOffline) {
            removeFromOffline();
        } else {
            downloadForOffline();
        }
    };

    if (variant === 'reading') {
        return (
            <Link
                to={`/books/${book.id}/read`}
                className="group flex-shrink-0 w-72 bg-gradient-to-br from-slate-800 to-slate-800/50 rounded-2xl overflow-hidden border border-slate-700/50 hover:border-amber-500/30 transition-all hover:shadow-xl hover:shadow-amber-500/5 hover:scale-[1.02]"
            >
                <div className="flex gap-4 p-4">
                    {/* Cover */}
                    <div className="flex-shrink-0 w-20 h-28 rounded-lg overflow-hidden bg-slate-700 shadow-lg">
                        {book.cover_url ? (
                            <img
                                src={book.cover_url}
                                alt={book.title}
                                className="w-full h-full object-cover"
                                loading="lazy"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <BookIcon className="h-8 w-8 text-slate-600" />
                            </div>
                        )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                        <div>
                            <h3 className="font-medium text-slate-100 text-sm line-clamp-2 group-hover:text-amber-400 transition-colors">
                                {book.title}
                            </h3>
                            <p className="text-slate-400 text-xs mt-1 line-clamp-1">
                                {book.author || t('Unknown Author')}
                            </p>
                        </div>

                        <div className="mt-2">
                            {/* Progress Bar */}
                            <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all"
                                        style={{ width: `${book.progress}%` }}
                                    />
                                </div>
                                <span className="text-xs font-medium text-amber-400">
                                    {Math.round(book.progress)}%
                                </span>
                            </div>

                            {/* Stats */}
                            <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                                <span className="flex items-center gap-1">
                                    <ClockIcon className="h-3.5 w-3.5" />
                                    {book.formatted_reading_time}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </Link>
        );
    }

    return (
        <Link
            to={`/books/${book.id}`}
            className="group bg-slate-800 rounded-xl overflow-hidden border border-slate-700 hover:border-slate-600 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-slate-900/50"
        >
            {/* Cover */}
            <div className="aspect-[2/3] bg-slate-700 relative overflow-hidden">
                {book.cover_url ? (
                    <img
                        src={book.cover_url}
                        alt={book.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <BookIcon className="h-16 w-16 text-slate-600" />
                    </div>
                )}

                {/* Status Badge */}
                <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                    {book.is_finished ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-600 text-white shadow-lg">
                            <CheckIcon className="w-3 h-3 mr-1" />
                            {t('Finished')}
                        </span>
                    ) : book.progress > 0 ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-600 text-white shadow-lg">
                            {Math.round(book.progress)}%
                        </span>
                    ) : null}
                    {isOffline && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-sky-600 text-white shadow-lg">
                            <CloudOfflineIcon className="w-3 h-3" />
                        </span>
                    )}
                </div>

                {/* Offline Download Button */}
                <button
                    onClick={handleOfflineToggle}
                    disabled={downloadState.isDownloading || isChecking}
                    className={`absolute bottom-2 right-2 p-2 rounded-full shadow-lg transition-all opacity-0 group-hover:opacity-100 ${
                        isOffline
                            ? 'bg-sky-600 hover:bg-sky-700 text-white'
                            : 'bg-slate-800/90 hover:bg-slate-700 text-slate-300'
                    } ${downloadState.isDownloading ? 'animate-pulse' : ''}`}
                    title={isOffline ? t('Remove from offline') : t('Download for offline')}
                >
                    {downloadState.isDownloading ? (
                        <span className="w-4 h-4 block text-xs font-bold">{downloadState.progress}%</span>
                    ) : isOffline ? (
                        <CloudOfflineIcon className="w-4 h-4" />
                    ) : (
                        <CloudDownloadIcon className="w-4 h-4" />
                    )}
                </button>
            </div>

            {/* Info */}
            <div className="p-3">
                <h3 className="font-medium text-slate-100 text-sm line-clamp-2 group-hover:text-indigo-400 transition-colors">
                    {book.title}
                </h3>
                <p className="text-slate-400 text-xs mt-1 line-clamp-1">
                    {book.author || t('Unknown Author')}
                </p>

                {/* Progress Bar */}
                <div className="mt-3 h-1 bg-slate-700 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all ${
                            book.is_finished ? 'bg-emerald-500' : 'bg-indigo-500'
                        }`}
                        style={{ width: `${book.progress}%` }}
                    />
                </div>

                {/* Stats */}
                <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                        <ClockIcon className="h-3.5 w-3.5" />
                        {book.formatted_reading_time}
                    </span>
                </div>
            </div>
        </Link>
    );
}
