<?php

namespace App\Http\Controllers;

use App\Models\Book;
use App\Models\BookSyncIdentifier;
use App\Services\ReadingSessionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ReaderController extends Controller
{
    public function __construct(
        protected ReadingSessionService $readingSessionService
    ) {}

    public function getPosition(Book $book): JsonResponse
    {
        if ($book->user_id !== Auth::id()) {
            abort(403);
        }

        $syncIdentifier = BookSyncIdentifier::where('book_id', $book->id)
            ->where('client', 'web')
            ->first();

        if (! $syncIdentifier || ! $syncIdentifier->raw_position) {
            return response()->json([
                'success' => false,
                'data' => null,
            ]);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'cfi' => $syncIdentifier->raw_position,
                'progress' => (float) $syncIdentifier->last_progress,
                'last_sync_at' => $syncIdentifier->last_sync_at?->toIso8601String(),
            ],
        ]);
    }

    public function savePosition(Request $request, Book $book): JsonResponse
    {
        if ($book->user_id !== Auth::id()) {
            abort(403);
        }

        $validated = $request->validate([
            'cfi' => 'required|string|max:500',
            'progress' => 'required|numeric|min:0|max:100',
        ]);

        $this->readingSessionService->processSyncEvent(
            book: $book,
            client: 'web',
            externalIdentifier: $book->file_hash,
            progress: $validated['progress'],
            rawPayload: ['source' => 'web_reader'],
            rawPosition: $validated['cfi']
        );

        return response()->json([
            'success' => true,
            'message' => __('Position saved'),
        ]);
    }
}
