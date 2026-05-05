<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\ListBooksRequest;
use App\Http\Requests\Api\StoreBookRequest;
use App\Http\Requests\Api\UpdateProgressRequest;
use App\Http\Resources\BookCollection;
use App\Http\Resources\BookResource;
use App\Http\Resources\ReadingSessionResource;
use App\Models\Book;
use App\Models\BookSyncIdentifier;
use App\Services\EpubService;
use App\Services\ProgressLoggingService;
use App\Services\ReadingSessionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class BookController extends Controller
{
    public function __construct(
        protected EpubService $epubService,
        protected ReadingSessionService $readingSessionService
    ) {}

    /**
     * GET /api/books
     * List user's books with filters, sorting, and search
     */
    public function index(ListBooksRequest $request): BookCollection
    {
        $query = Book::where('user_id', Auth::id());

        // Search
        if ($search = $request->validated('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('author', 'like', "%{$search}%");
            });
        }

        // Status filter
        if ($status = $request->validated('status')) {
            match ($status) {
                'not_started' => $query->where('progress', 0)->where('is_finished', false),
                'reading' => $query->where('progress', '>', 0)->where('is_finished', false),
                'finished' => $query->where('is_finished', true),
                default => null,
            };
        }

        // Sorting
        $sortBy = $request->validated('sort_by', 'created_at');
        $sortDir = $request->validated('sort_dir', 'desc');
        $query->orderBy($sortBy, $sortDir);

        // Pagination - explicitly cast page to int to prevent array injection
        $perPage = $request->validated('per_page', 20);
        $page = (int) $request->input('page', 1);

        return new BookCollection($query->paginate($perPage, ['*'], 'page', $page));
    }

    /**
     * POST /api/books
     * Upload new EPUB book
     */
    public function store(StoreBookRequest $request): JsonResponse
    {
        $file = $request->file('file');

        try {
            $book = $this->epubService->processUpload($file, Auth::user());

            return response()->json([
                'message' => __('Book uploaded successfully'),
                'book' => new BookResource($book),
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * GET /api/books/{book}
     * Get book details with metadata
     */
    public function show(Book $book): BookResource|JsonResponse
    {
        if (! $this->authorizeBook($book)) {
            return response()->json(['message' => __('Access denied')], 403);
        }

        return new BookResource($book);
    }

    /**
     * DELETE /api/books/{book}
     * Delete a book
     */
    public function destroy(Book $book): JsonResponse
    {
        if (! $this->authorizeBook($book)) {
            return response()->json(['message' => __('Access denied')], 403);
        }

        $this->epubService->deleteBook($book);

        return response()->json([
            'message' => __('Book deleted successfully'),
        ]);
    }

    /**
     * GET /api/books/{book}/download
     * Download EPUB file (with caching support)
     */
    public function download(Request $request, Book $book): BinaryFileResponse|JsonResponse
    {
        if (! $this->authorizeBook($book)) {
            return response()->json(['message' => __('Access denied')], 403);
        }

        $path = $this->epubService->getEpubPath($book);

        if (! file_exists($path)) {
            return response()->json(['message' => __('Book file not found')], 404);
        }

        // Use file_hash as ETag (EPUBs are content-addressed)
        $etag = '"' . $book->file_hash . '"';
        $lastModified = filemtime($path);

        // Check If-None-Match header for 304 response
        if ($request->header('If-None-Match') === $etag) {
            return response()->json(null, 304);
        }

        return response()->file($path, [
            'Content-Type' => 'application/epub+zip',
            'Content-Disposition' => 'inline; filename="' . $book->filename . '"',
            'ETag' => $etag,
            'Last-Modified' => gmdate('D, d M Y H:i:s', $lastModified) . ' GMT',
            'Cache-Control' => 'private, max-age=31536000, immutable', // 1 year, immutable (hash-based)
        ]);
    }

    /**
     * GET /api/books/{book}/cover
     * Get cover image
     */
    public function cover(Book $book): StreamedResponse|JsonResponse
    {
        if (! $this->authorizeBook($book)) {
            return response()->json(['message' => __('Access denied')], 403);
        }

        if (! $book->cover_path || ! Storage::disk('public')->exists($book->cover_path)) {
            return response()->json(['message' => __('Cover not found')], 404);
        }

        $path = Storage::disk('public')->path($book->cover_path);
        $mimeType = mime_content_type($path);

        return response()->file($path, [
            'Content-Type' => $mimeType,
            'Cache-Control' => 'public, max-age=86400',
        ]);
    }

    /**
     * GET /api/books/{book}/sessions
     * Get reading sessions for a book (paginated)
     */
    public function sessions(Request $request, Book $book): JsonResponse
    {
        if (! $this->authorizeBook($book)) {
            return response()->json(['message' => __('Access denied')], 403);
        }

        $sessions = $book->readingSessions()
            ->orderBy('started_at', 'desc')
            ->paginate($request->get('per_page', 15));

        return response()->json([
            'data' => ReadingSessionResource::collection($sessions),
            'meta' => [
                'current_page' => $sessions->currentPage(),
                'last_page' => $sessions->lastPage(),
                'per_page' => $sessions->perPage(),
                'total' => $sessions->total(),
            ],
        ]);
    }

    /**
     * GET /api/books/{book}/progress
     * Get current reading position
     */
    public function getProgress(Request $request, Book $book): JsonResponse
    {
        if (! $this->authorizeBook($book)) {
            return response()->json(['message' => __('Access denied')], 403);
        }

        $syncIdentifier = BookSyncIdentifier::where('book_id', $book->id)
            ->where('client', 'web')
            ->first();

        $lastSync = $this->readingSessionService->getLastSyncIdentifier($book);

        $responseData = [
            'progress' => (float) $book->progress,
            'position' => $syncIdentifier?->raw_position,
            'last_sync_at' => $lastSync?->last_sync_at?->toIso8601String(),
            'last_sync_client' => $lastSync?->client,
        ];

        ProgressLoggingService::log(
            request: $request,
            action: 'load_progress',
            bookId: $book->id,
            client: 'web',
            responseData: $responseData
        );

        // Always return progress, even if no CFI position is available
        // This allows fallback to percentage-based navigation
        return response()->json(['data' => $responseData]);
    }

    /**
     * PUT /api/books/{book}/progress
     * Update reading position
     */
    public function updateProgress(UpdateProgressRequest $request, Book $book): JsonResponse
    {
        if (! $this->authorizeBook($book)) {
            return response()->json(['message' => __('Access denied')], 403);
        }

        $validated = $request->validated();
        $client = $validated['client'] ?? 'web';

        ProgressLoggingService::log(
            request: $request,
            action: 'save_progress',
            bookId: $book->id,
            client: $client,
            requestData: $validated
        );

        $this->readingSessionService->processSyncEvent(
            book: $book,
            client: $client,
            externalIdentifier: $book->file_hash,
            progress: $validated['progress'],
            rawPayload: ['source' => 'api', 'timestamp' => $validated['timestamp'] ?? now()->toIso8601String()],
            rawPosition: $validated['position'] ?? null
        );

        return response()->json([
            'message' => __('Progress updated'),
            'data' => [
                'progress' => (float) $book->fresh()->progress,
            ],
        ]);
    }

    /**
     * POST /api/books/{book}/progress/batch
     * Batch update reading positions (for offline sync)
     */
    public function batchProgress(Request $request, Book $book): JsonResponse
    {
        if (! $this->authorizeBook($book)) {
            return response()->json(['message' => __('Access denied')], 403);
        }

        $updates = $request->validate([
            'updates' => 'required|array|min:1',
            'updates.*.cfi' => 'required|string',
            'updates.*.progress' => 'required|numeric|min:0|max:100',
            'updates.*.timestamp' => 'required|date',
        ])['updates'];

        ProgressLoggingService::log(
            request: $request,
            action: 'batch_progress',
            bookId: $book->id,
            client: 'web',
            requestData: ['updates_count' => count($updates), 'updates' => $updates]
        );

        // Sort by timestamp to process in order
        usort($updates, fn ($a, $b) => strtotime($a['timestamp']) <=> strtotime($b['timestamp']));

        foreach ($updates as $update) {
            $this->readingSessionService->processSyncEvent(
                book: $book,
                client: 'web',
                externalIdentifier: $book->file_hash,
                progress: $update['progress'],
                rawPayload: ['source' => 'offline_sync', 'timestamp' => $update['timestamp']],
                rawPosition: $update['cfi']
            );
        }

        return response()->json([
            'message' => __('Progress updated'),
            'data' => [
                'progress' => (float) $book->fresh()->progress,
                'synced_count' => count($updates),
            ],
        ]);
    }

    /**
     * DELETE /api/books/{book}/stats
     * Reset all reading stats for a book
     */
    public function resetStats(Book $book): JsonResponse
    {
        if (! $this->authorizeBook($book)) {
            return response()->json(['message' => __('Access denied')], 403);
        }

        // Delete all reading sessions
        $book->readingSessions()->delete();

        // Delete all sync identifiers
        $book->syncIdentifiers()->delete();

        // Reset book progress
        $book->update([
            'progress' => 0,
            'is_finished' => false,
        ]);

        return response()->json([
            'message' => __('Reading stats reset successfully'),
        ]);
    }

    /**
     * Authorize that the book belongs to the authenticated user
     */
    protected function authorizeBook(Book $book): bool
    {
        return $book->user_id === Auth::id();
    }
}
