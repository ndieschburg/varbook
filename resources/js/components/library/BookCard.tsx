import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Book } from '@/types';
import { ProgressBar, Badge } from '@/components/ui';

interface BookCardProps {
    book: Book;
    variant?: 'grid' | 'reading';
}

function BookIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
    );
}

function ClockIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    );
}

function CheckIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
    );
}

export function BookCard({ book, variant = 'grid' }: BookCardProps) {
    const { t } = useTranslation();

    if (variant === 'reading') {
        return (
            <Link
                to={`/book/${book.id}`}
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
            to={`/book/${book.id}`}
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
                <div className="absolute top-2 right-2">
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
                </div>
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
