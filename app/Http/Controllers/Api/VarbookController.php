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
        $book = $this->readingSessionService->findBookByKoreaderHash(Auth::id(), $documentHash);

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
        $book = $this->readingSessionService->findBookByKoreaderHash(Auth::id(), $documentHash);

        if (! $book) {
            return response()->json([
                'message' => __('Document not found'),
            ], 404);
        }

        $validated = $request->validate([
            'updates' => 'required|array|min:1|max:500',
            'updates.*.progress' => 'required|numeric|min:0|max:100',
            'updates.*.timestamp' => 'required|date',
            'updates.*.position' => 'nullable|string|max:500',
        ]);

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

        return response()->json([
            'message' => __('Progress updated'),
            'data' => [
                'progress' => (float) $book->fresh()->progress,
                'synced_count' => count($updates),
            ],
        ]);
    }
}
