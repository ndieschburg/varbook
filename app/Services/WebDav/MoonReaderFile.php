<?php

namespace App\Services\WebDav;

use App\Models\Book;
use App\Models\BookSyncIdentifier;
use App\Models\User;
use App\Services\ReadingSessionService;
use Illuminate\Support\Facades\Log;
use Sabre\DAV\File;
use Sabre\DAV\Exception\NotFound;

class MoonReaderFile extends File
{
    protected string $name;
    protected ?Book $book;
    protected User $user;
    protected ?string $data = null;
    protected string $fullPath;

    public function __construct(string $name, ?Book $book, User $user, string $fullPath = '')
    {
        $this->name = $name;
        $this->book = $book;
        $this->user = $user;
        $this->fullPath = $fullPath ?: $name;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function get()
    {
        // Try to find book and sync data
        $book = $this->findBook();

        if ($book) {
            // Start a reading session (book is being opened)
            $readingService = app(ReadingSessionService::class);
            $readingService->startSession($book, 'moon', $this->fullPath);

            Log::channel('webdav')->debug('GET - Started reading session', [
                'book_id' => $book->id,
                'title' => $book->title,
            ]);

            // Get the most recent sync for this book
            $syncIdentifier = BookSyncIdentifier::where('book_id', $book->id)
                ->where('client', 'moon')
                ->orderBy('last_sync_at', 'desc')
                ->first();

            if ($syncIdentifier && $syncIdentifier->raw_position) {
                // Return the raw position data stored from Moon+ Reader
                Log::channel('webdav')->debug('GET returning raw position', [
                    'book_id' => $book->id,
                    'raw_position' => $syncIdentifier->raw_position,
                ]);

                return $syncIdentifier->raw_position;
            }
        }

        // Return empty/default position
        return '0*0@0#0:0%';
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
        return 'text/plain';
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

        // Process the sync event (end the session started on GET)
        $readingService = app(ReadingSessionService::class);
        $readingService->processSyncEvent(
            $book,
            'moon',
            $this->fullPath,
            $syncData['progress'] ?? 0,
            ['raw' => $data],
            $data  // Pass raw position data for Moon+ Reader sync
        );

        Log::channel('webdav')->debug('PUT - Ended reading session', [
            'book_id' => $book->id,
            'progress' => $syncData['progress'] ?? 0,
            'raw_position' => $data,
        ]);

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

        // Extract book name from the file path
        // Example: Apps/Books/.Moon+/Cache/Les Bienveillantes - Jonathan Littell.epub.po
        $bookName = $this->extractBookName();

        Log::channel('webdav')->debug('Finding book', [
            'name' => $this->name,
            'fullPath' => $this->fullPath,
            'extractedName' => $bookName,
        ]);

        if (empty($bookName)) {
            return null;
        }

        // Try exact filename match first
        $book = Book::where('user_id', $this->user->id)
            ->where('filename', 'like', "%{$bookName}%")
            ->first();

        // If not found, try title match
        if (!$book) {
            // Extract title without author (before the dash)
            $titleOnly = preg_replace('/\s*-\s*[^-]+$/', '', $bookName);

            $book = Book::where('user_id', $this->user->id)
                ->where(function ($query) use ($bookName, $titleOnly) {
                    $query->where('title', 'like', "%{$bookName}%")
                        ->orWhere('title', 'like', "%{$titleOnly}%");
                })
                ->first();
        }

        if ($book) {
            Log::channel('webdav')->info('Book found', [
                'book_id' => $book->id,
                'title' => $book->title,
            ]);

            // Create sync identifier for future use
            BookSyncIdentifier::firstOrCreate([
                'book_id' => $book->id,
                'client' => 'moon',
                'external_identifier' => $this->fullPath,
            ], [
                'last_sync_at' => now(),
                'last_progress' => 0,
            ]);

            return $book;
        }

        return null;
    }

    protected function extractBookName(): string
    {
        // Get the filename from the path
        $filename = basename($this->fullPath);

        // Remove Moon+ Reader extensions (.po, .pos, etc.)
        $cleanName = preg_replace('/\.(po|pos|json|sync)$/i', '', $filename);

        // Remove .epub extension if present
        $cleanName = preg_replace('/\.epub$/i', '', $cleanName);

        // URL decode
        $cleanName = urldecode($cleanName);

        return trim($cleanName);
    }
}
