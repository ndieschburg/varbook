<?php

namespace App\Services\WebDav;

use App\Models\Book;
use App\Models\BookSyncIdentifier;
use App\Models\User;
use App\Services\ReadingSessionService;
use Sabre\DAV\File;
use Sabre\DAV\Exception\NotFound;

class MoonReaderFile extends File
{
    protected string $name;
    protected ?Book $book;
    protected User $user;
    protected ?string $data = null;

    public function __construct(string $name, ?Book $book, User $user)
    {
        $this->name = $name;
        $this->book = $book;
        $this->user = $user;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function get()
    {
        if ($this->book) {
            // Return the last sync data if available
            $syncIdentifier = BookSyncIdentifier::where('book_id', $this->book->id)
                ->where('external_identifier', $this->name)
                ->where('client', 'moon')
                ->first();

            if ($syncIdentifier) {
                return json_encode([
                    'progress' => $syncIdentifier->last_progress,
                    'last_sync' => $syncIdentifier->last_sync_at?->toIso8601String(),
                ]);
            }
        }

        return '{}';
    }

    public function getSize(): int
    {
        return strlen($this->get());
    }

    public function getETag(): ?string
    {
        return '"' . md5($this->get()) . '"';
    }

    public function getContentType(): ?string
    {
        return 'application/json';
    }

    public function getLastModified(): ?int
    {
        if ($this->book) {
            $syncIdentifier = BookSyncIdentifier::where('book_id', $this->book->id)
                ->where('external_identifier', $this->name)
                ->where('client', 'moon')
                ->first();

            if ($syncIdentifier && $syncIdentifier->last_sync_at) {
                return $syncIdentifier->last_sync_at->timestamp;
            }
        }

        return time();
    }

    public function put($data): ?string
    {
        if (is_resource($data)) {
            $data = stream_get_contents($data);
        }

        $this->data = $data;

        // Parse the Moon+ Reader sync data
        $syncData = $this->parseMoonReaderData($data);

        if (!$syncData) {
            return null;
        }

        // Try to find the book
        $book = $this->findBook();

        if (!$book) {
            // Store pending sync data - the book might be uploaded later
            \Log::info('WebDAV: No matching book found for sync', [
                'user_id' => $this->user->id,
                'identifier' => $this->name,
            ]);
            return null;
        }

        // Process the sync event
        $readingService = app(ReadingSessionService::class);
        $readingService->processSyncEvent(
            $book,
            'moon',
            $this->name,
            $syncData['progress'] ?? 0,
            ['raw' => $data]
        );

        return null;
    }

    public function delete(): void
    {
        if ($this->book) {
            BookSyncIdentifier::where('book_id', $this->book->id)
                ->where('external_identifier', $this->name)
                ->where('client', 'moon')
                ->delete();
        }
    }

    protected function parseMoonReaderData(?string $data): ?array
    {
        if (empty($data)) {
            return null;
        }

        // Moon+ Reader can send different formats
        // Try JSON first
        $json = json_decode($data, true);
        if ($json && isset($json['progress'])) {
            return $json;
        }

        // Try to parse position data from Moon+ Reader format
        // Moon+ stores position as percentage or page number
        if (preg_match('/(\d+(?:\.\d+)?)\s*%/', $data, $matches)) {
            return ['progress' => (float) $matches[1]];
        }

        // Try to extract any number as progress
        if (preg_match('/(\d+(?:\.\d+)?)/', $data, $matches)) {
            $value = (float) $matches[1];
            // If it looks like a percentage (0-100)
            if ($value <= 100) {
                return ['progress' => $value];
            }
        }

        return null;
    }

    protected function findBook(): ?Book
    {
        // Try to find by existing sync identifier
        if ($this->book) {
            return $this->book;
        }

        // Try to match by filename in the identifier
        $cleanName = preg_replace('/\.(pos|json|sync)$/i', '', $this->name);
        $cleanName = preg_replace('/[_-]/', ' ', $cleanName);

        // Try exact filename match
        $book = Book::where('user_id', $this->user->id)
            ->where(function ($query) use ($cleanName) {
                $query->where('filename', 'like', "%{$cleanName}%")
                    ->orWhere('title', 'like', "%{$cleanName}%");
            })
            ->first();

        if ($book) {
            // Create sync identifier for future use
            BookSyncIdentifier::firstOrCreate([
                'book_id' => $book->id,
                'client' => 'moon',
                'external_identifier' => $this->name,
            ], [
                'last_sync_at' => now(),
                'last_progress' => 0,
            ]);

            return $book;
        }

        return null;
    }
}
