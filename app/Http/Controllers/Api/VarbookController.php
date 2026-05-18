<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BookSyncIdentifier;
use App\Services\ProgressLoggingService;
use App\Services\ReadingSessionService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class VarbookController extends Controller
{
    public function __construct(
        protected ReadingSessionService $readingSessionService
    ) {}

    /**
     * GET /api/varbook/progress/{documentHash}
     *
     * Returns the most recent progress for a book, regardless of which client set it.
     * Used by the KOReader Varbook plugin to check if another device has advanced.
     */
    public function getProgress(Request $request, string $documentHash): JsonResponse
    {
        $filename = $request->query('filename');
        $book = $this->readingSessionService->findBookByHashOrFilename(Auth::id(), $documentHash, $filename);

        if (! $book) {
            return response()->json([
                'message' => __('Document not found'),
            ], 404);
        }

        $lastSync = $this->readingSessionService->getLastSyncIdentifier($book);
        $koreaderSync = BookSyncIdentifier::where('book_id', $book->id)
            ->where('client', 'koreader')
            ->first();

        $responseData = [
            'progress' => (float) $book->progress,
            'position' => $koreaderSync?->raw_position,
            'last_sync_at' => $book->last_read_at?->toIso8601String(),
            'last_sync_client' => $lastSync?->client,
            'timestamp' => $book->last_read_at?->timestamp ?? 0,
            'pivot' => $book->reading_pivot,
        ];

        ProgressLoggingService::log(
            request: $request,
            action: 'varbook_get',
            bookId: $book->id,
            client: 'koreader',
            requestData: ['document' => $documentHash],
            responseData: $responseData
        );

        return response()->json($responseData);
    }

    /**
     * POST /api/varbook/progress/{documentHash}/batch
     *
     * Accepts batch position updates (percentage + timestamp) from the KOReader plugin.
     * Each update is processed through ReadingSessionService for session tracking.
     */
    public function batchProgress(Request $request, string $documentHash): JsonResponse
    {
        $validated = $request->validate([
            'updates' => 'required|array|min:1|max:500',
            'updates.*.progress' => 'required|numeric|min:0|max:100',
            'updates.*.timestamp' => 'required|date',
            'updates.*.position' => 'nullable|string|max:500',
            'filename' => 'nullable|string|max:500',
            'pivot' => 'nullable|array',
            'pivot.spine_index' => 'required_with:pivot|numeric|min:0',
            'pivot.spine_href' => 'nullable|string|max:500',
            'pivot.spine_percent' => 'required_with:pivot|numeric|min:0|max:1',
            'pivot.source' => 'required_with:pivot|string|in:web,koreader',
        ]);

        $book = $this->readingSessionService->findBookByHashOrFilename(
            Auth::id(),
            $documentHash,
            $validated['filename'] ?? null
        );

        if (! $book) {
            return response()->json([
                'message' => __('Document not found'),
            ], 404);
        }

        $updates = $validated['updates'];

        ProgressLoggingService::log(
            request: $request,
            action: 'varbook_batch',
            bookId: $book->id,
            client: 'koreader',
            requestData: ['updates_count' => count($updates), 'updates' => $updates]
        );

        // Sort by timestamp to process in chronological order
        usort($updates, fn ($a, $b) => strtotime($a['timestamp']) <=> strtotime($b['timestamp']));

        foreach ($updates as $update) {
            $this->readingSessionService->processSyncEvent(
                book: $book,
                client: 'koreader',
                externalIdentifier: $documentHash,
                progress: $update['progress'],
                rawPayload: ['source' => 'varbook_plugin', 'timestamp' => $update['timestamp']],
                rawPosition: $update['position'] ?? null,
                eventTimestamp: Carbon::parse($update['timestamp'])
            );
        }

        // Update pivot if provided
        if (! empty($validated['pivot'])) {
            $book->updatePivot($validated['pivot']);
        }

        return response()->json([
            'message' => __('Progress updated'),
            'data' => [
                'progress' => (float) $book->fresh()->progress,
                'synced_count' => count($updates),
            ],
        ]);
    }
}
