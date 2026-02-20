import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useBook, useBookSessions, useDeleteBook } from '@/api/hooks';
import { LoadingSpinner, ConfirmModal } from '@/components/ui';
import { BookIcon, ArrowLeftIcon, DownloadIcon, TrashIcon, CheckCircleIcon, ClockIcon, CloudDownloadIcon, CloudOfflineIcon } from '@/components/icons';
import { useBookOfflineStatus } from '@/hooks/useBookOfflineStatus';

function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function BookDetailPage() {
    const { t } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const bookId = Number(id);

    const { data: book, isLoading: bookLoading } = useBook(bookId);
    const { data: sessionsData, isLoading: sessionsLoading } = useBookSessions(bookId);
    const deleteMutation = useDeleteBook();

    const { isOffline, downloadState, downloadForOffline, removeFromOffline } =
        useBookOfflineStatus({
            bookId,
            title: book?.title,
            author: book?.author,
            coverUrl: book?.cover_url,
        });

    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const handleDelete = async () => {
        try {
            await deleteMutation.mutateAsync(bookId);
            toast.success(t('Book deleted successfully'));
            navigate('/library');
        } catch {
            toast.error(t('Delete') + ' failed');
        }
    };

    if (bookLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    if (!book) {
        return (
            <div className="text-center py-16">
                <p className="text-slate-400">{t('Book file not found')}</p>
                <Link to="/library" className="text-indigo-400 hover:text-indigo-300 mt-4 inline-block">
                    {t('Back to Library')}
                </Link>
            </div>
        );
    }

    const sessions = sessionsData?.data || [];

    return (
        <div>
            {/* Back Link */}
            <Link
                to="/library"
                className="inline-flex items-center text-slate-400 hover:text-slate-100 mb-6 transition-colors"
            >
                <ArrowLeftIcon className="h-5 w-5 mr-2" />
                {t('Back to Library')}
            </Link>

            {/* Book Header */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                <div className="md:flex">
                    {/* Cover */}
                    <div className="md:w-64 md:flex-shrink-0">
                        <div className="aspect-[2/3] bg-slate-700">
                            {book.cover_url ? (
                                <img
                                    src={book.cover_url}
                                    alt={book.title}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <BookIcon className="h-24 w-24 text-slate-600" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Info */}
                    <div className="p-6 flex-1">
                        <div className="flex items-start justify-between">
                            <div>
                                <h1 className="text-2xl font-bold text-slate-100">{book.title}</h1>
                                <p className="text-lg text-slate-400 mt-1">
                                    {book.author || t('Unknown Author')}
                                </p>
                            </div>

                            {/* Status Badge */}
                            {book.is_finished ? (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-emerald-600 text-white">
                                    <CheckCircleIcon className="h-4 w-4 mr-1" />
                                    {t('Finished')}
                                </span>
                            ) : book.progress > 0 ? (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-amber-600 text-white">
                                    {t('Reading')}
                                </span>
                            ) : (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-slate-600 text-slate-300">
                                    {t('Not Started')}
                                </span>
                            )}
                        </div>

                        {/* Progress */}
                        <div className="mt-6">
                            <div className="flex items-center justify-between text-sm mb-2">
                                <span className="text-slate-400">{t('Progress')}</span>
                                <span className="text-slate-100 font-medium">
                                    {book.progress.toFixed(1)}%
                                </span>
                            </div>
                            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-indigo-500 rounded-full transition-all"
                                    style={{ width: `${book.progress}%` }}
                                />
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div className="bg-slate-700/50 rounded-lg p-3">
                                <p className="text-slate-400 text-xs">{t('Reading Time')}</p>
                                <p className="text-slate-100 font-medium mt-1">
                                    {book.formatted_reading_time}
                                </p>
                            </div>
                            <div className="bg-slate-700/50 rounded-lg p-3">
                                <p className="text-slate-400 text-xs">{t('File Size')}</p>
                                <p className="text-slate-100 font-medium mt-1">
                                    {formatFileSize(book.file_size)}
                                </p>
                            </div>
                            <div className="bg-slate-700/50 rounded-lg p-3">
                                <p className="text-slate-400 text-xs">{t('Language')}</p>
                                <p className="text-slate-100 font-medium mt-1">
                                    {book.language || 'N/A'}
                                </p>
                            </div>
                            <div className="bg-slate-700/50 rounded-lg p-3">
                                <p className="text-slate-400 text-xs">{t('Added')}</p>
                                <p className="text-slate-100 font-medium mt-1">
                                    {formatDate(book.created_at)}
                                </p>
                            </div>
                        </div>

                        {/* Metadata */}
                        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                            {book.publisher && (
                                <div>
                                    <span className="text-slate-400">{t('Publisher')}:</span>
                                    <span className="text-slate-300 ml-1">{book.publisher}</span>
                                </div>
                            )}
                            {book.isbn && (
                                <div>
                                    <span className="text-slate-400">{t('ISBN')}:</span>
                                    <span className="text-slate-300 ml-1">{book.isbn}</span>
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="mt-6 flex flex-wrap gap-3">
                            <Link
                                to={`/books/${book.id}/read`}
                                className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                                <BookIcon className="h-5 w-5 mr-2" />
                                {t('Read')}
                            </Link>

                            {isOffline ? (
                                <button
                                    onClick={removeFromOffline}
                                    className="inline-flex items-center px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium rounded-lg transition-colors"
                                >
                                    <CloudOfflineIcon className="h-5 w-5 mr-2" />
                                    {t('Available offline')}
                                </button>
                            ) : (
                                <button
                                    onClick={downloadForOffline}
                                    disabled={downloadState.isDownloading}
                                    className="inline-flex items-center px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                                >
                                    <CloudDownloadIcon className="h-5 w-5 mr-2" />
                                    {downloadState.isDownloading
                                        ? `${t('Downloading')}... ${downloadState.progress}%`
                                        : t('Save for offline')}
                                </button>
                            )}

                            <a
                                href={`/api/books/${book.id}/download`}
                                className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                                <DownloadIcon className="h-5 w-5 mr-2" />
                                {t('Download EPUB')}
                            </a>

                            <button
                                onClick={() => setShowDeleteModal(true)}
                                className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                                <TrashIcon className="h-5 w-5 mr-2" />
                                {t('Delete')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Reading Sessions */}
            <div className="mt-8">
                <h2 className="text-lg font-semibold text-slate-100 mb-4">
                    {t('Reading Sessions')}
                </h2>

                {sessionsLoading ? (
                    <div className="flex justify-center py-8">
                        <LoadingSpinner />
                    </div>
                ) : sessions.length > 0 ? (
                    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-700">
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                        {t('Date')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                        {t('Duration')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                        {t('Progress')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                        {t('Client')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                                {sessions.map((session) => (
                                    <tr key={session.id} className="hover:bg-slate-700/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                                            {new Date(session.started_at).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                                            {session.formatted_duration}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                                            {session.start_progress.toFixed(1)}% → {session.end_progress.toFixed(1)}%
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-600 text-slate-300">
                                                {session.client}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="bg-slate-800 rounded-xl border border-slate-700 p-8 text-center">
                        <ClockIcon className="mx-auto h-12 w-12 text-slate-600" />
                        <h3 className="mt-4 text-sm font-medium text-slate-300">
                            {t('No reading sessions yet')}
                        </h3>
                        <p className="mt-2 text-sm text-slate-500">
                            {t('Open this book in Moon+ Reader to start tracking your progress.')}
                        </p>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDelete}
                title={t('Delete')}
                message={
                    <>
                        <p>{t('Are you sure you want to delete this book?')}</p>
                        <p className="mt-2 text-sm text-slate-400">
                            {t('This action cannot be undone.')}
                        </p>
                    </>
                }
                confirmText={t('Delete')}
                cancelText={t('Cancel')}
                isLoading={deleteMutation.isPending}
                variant="danger"
            />
        </div>
    );
}
