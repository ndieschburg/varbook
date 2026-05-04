<?php

namespace App\Services;

use App\Facades\Settings;
use App\Models\Book;
use App\Models\BookSyncIdentifier;
use App\Models\ReadingSession;
use Carbon\Carbon;

class ReadingSessionService
{
    protected function getSessionGapMinutes(): int
    {
        return (int) Settings::get('general.session_gap_minutes') ?? config('bookshelf.session_gap_minutes', 10);
    }

    protected function getMaxSessionHours(): int
    {
        return (int) Settings::get('general.max_session_hours') ?? config('bookshelf.max_session_hours', 4);
    }

    protected function getFinishedThreshold(): float
    {
        return (float) Settings::get('general.finished_threshold') ?? config('bookshelf.finished_threshold', 95);
    }

    public function processSyncEvent(
        Book $book,
        string $client,
        string $externalIdentifier,
        float $progress,
        ?array $rawPayload = null,
        ?string $rawPosition = null
    ): ReadingSession {
        $now = Carbon::now();

        // Get or create sync identifier
        $syncIdentifier = BookSyncIdentifier::firstOrCreate(
            [
                'book_id' => $book->id,
                'client' => $client,
                'external_identifier' => $externalIdentifier,
            ],
            [
                'last_sync_at' => $now,
                'last_progress' => $progress,
            ]
        );

        // Determine if this is same session or new session
        $session = $this->getOrCreateSession($book, $syncIdentifier, $client, $progress, $now, $rawPayload);

        // Update sync identifier with raw position data
        $syncIdentifier->last_sync_at = $now;
        $syncIdentifier->last_progress = $progress;
        if ($rawPosition) {
            $syncIdentifier->raw_position = $rawPosition;
        }
        $syncIdentifier->save();

        // Update book progress and last read timestamp
        $book->updateProgress($progress);
        $book->last_read_at = $now;
        $book->save();

        // Recalculate total reading time
        $book->recalculateReadingTime();

        return $session;
    }

    protected function getOrCreateSession(
        Book $book,
        BookSyncIdentifier $syncIdentifier,
        string $client,
        float $progress,
        Carbon $now,
        ?array $rawPayload
    ): ReadingSession {
        $lastSyncAt = $syncIdentifier->last_sync_at;

        // If this is the first sync or gap too large, create new session
        if (!$lastSyncAt) {
            return $this->createNewSession($book, $client, $progress, $now, $rawPayload);
        }

        $gapMinutes = $lastSyncAt->diffInMinutes($now);

        // Check if we should continue existing session
        if ($gapMinutes <= $this->getSessionGapMinutes()) {
            return $this->continueSession($book, $client, $progress, $now, $rawPayload);
        }

        // Gap too large, create new session
        return $this->createNewSession($book, $client, $progress, $now, $rawPayload);
    }

    protected function createNewSession(
        Book $book,
        string $client,
        float $progress,
        Carbon $now,
        ?array $rawPayload
    ): ReadingSession {
        return ReadingSession::create([
            'book_id' => $book->id,
            'started_at' => $now,
            'ended_at' => $now,
            'duration_seconds' => 0,
            'progress_before' => $book->progress,
            'progress_after' => $progress,
            'client' => $client,
            'raw_payload' => $rawPayload,
        ]);
    }

    protected function continueSession(
        Book $book,
        string $client,
        float $progress,
        Carbon $now,
        ?array $rawPayload
    ): ReadingSession {
        // Find the most recent session for this book
        $session = ReadingSession::where('book_id', $book->id)
            ->where('client', $client)
            ->orderBy('ended_at', 'desc')
            ->first();

        if (!$session) {
            return $this->createNewSession($book, $client, $progress, $now, $rawPayload);
        }

        // Check if session duration would exceed max hours
        $sessionDurationHours = $session->started_at->diffInHours($now);

        if ($sessionDurationHours >= $this->getMaxSessionHours()) {
            // Cap the current session and create a new one
            return $this->createNewSession($book, $client, $progress, $now, $rawPayload);
        }

        // Update existing session
        $session->ended_at = $now;
        $session->duration_seconds = $session->started_at->diffInSeconds($now);
        $session->progress_after = $progress;

        if ($rawPayload) {
            $session->raw_payload = $rawPayload;
        }

        $session->save();

        return $session;
    }

    public function findBookByExternalIdentifier(int $userId, string $client, string $externalIdentifier): ?Book
    {
        $syncIdentifier = BookSyncIdentifier::where('client', $client)
            ->where('external_identifier', $externalIdentifier)
            ->whereHas('book', function ($query) use ($userId) {
                $query->where('user_id', $userId);
            })
            ->first();

        return $syncIdentifier?->book;
    }

    public function findBookByHash(int $userId, string $fileHash): ?Book
    {
        return Book::where('user_id', $userId)
            ->where('file_hash', $fileHash)
            ->first();
    }

    /**
     * Find a book by KOReader's partial MD5 hash.
     *
     * Falls back to the full file_hash for backwards compatibility with
     * books that were synced before the koreader_file_hash field existed.
     */
    public function findBookByKoreaderHash(int $userId, string $hash): ?Book
    {
        return Book::where('user_id', $userId)
            ->where(function ($query) use ($hash) {
                $query->where('koreader_file_hash', $hash)
                    ->orWhere('file_hash', $hash);
            })
            ->first();
    }

    public function createSyncIdentifier(Book $book, string $client, string $externalIdentifier): BookSyncIdentifier
    {
        return BookSyncIdentifier::firstOrCreate([
            'book_id' => $book->id,
            'client' => $client,
            'external_identifier' => $externalIdentifier,
        ], [
            'last_sync_at' => now(),
            'last_progress' => $book->progress,
        ]);
    }

    /**
     * Start a reading session when the book is opened.
     * Called on GET (when Moon+ Reader opens a book).
     */
    public function startSession(Book $book, string $client, string $externalIdentifier): ReadingSession
    {
        $now = Carbon::now();

        // Get or create sync identifier
        BookSyncIdentifier::firstOrCreate(
            [
                'book_id' => $book->id,
                'client' => $client,
                'external_identifier' => $externalIdentifier,
            ],
            [
                'last_sync_at' => $now,
                'last_progress' => $book->progress,
            ]
        );

        // Check if there's already an active session (last activity within gap)
        $recentSession = ReadingSession::where('book_id', $book->id)
            ->where('client', $client)
            ->where('ended_at', '>=', $now->copy()->subMinutes($this->getSessionGapMinutes()))
            ->orderBy('ended_at', 'desc')
            ->first();

        if ($recentSession) {
            return $recentSession;
        }

        // Create new session
        return ReadingSession::create([
            'book_id' => $book->id,
            'started_at' => $now,
            'ended_at' => $now,
            'duration_seconds' => 0,
            'progress_before' => $book->progress,
            'progress_after' => $book->progress,
            'client' => $client,
            'raw_payload' => null,
        ]);
    }
}
