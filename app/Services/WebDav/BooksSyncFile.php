<?php

namespace App\Services\WebDav;

use App\Models\Book;
use App\Models\User;
use Illuminate\Support\Facades\Storage;
use Sabre\DAV\File;

/**
 * Generates the books.sync file dynamically from the user's library.
 * This file is used by Moon+ Reader to discover available books.
 */
class BooksSyncFile extends File
{
    protected string $storagePath;

    public function __construct(
        protected User $user,
        protected string $fullPath
    ) {
        $this->storagePath = "moon-reader/{$user->id}/{$fullPath}";
    }

    public function getName(): string
    {
        return 'books.sync';
    }

    public function get()
    {
        return $this->generateBooksSync();
    }

    /**
     * Generate zlib-compressed JSON with all library books.
     */
    protected function generateBooksSync(): string
    {
        $books = Book::where('user_id', $this->user->id)->get();

        $syncData = $books->map(function (Book $book) {
            return [
                'addTime' => (string) ($book->created_at->timestamp * 1000),
                'author' => $book->author ?? '',
                'bookName' => $book->title,
                'category' => '',
                'description' => $book->description ?? '',
                'deviceId' => (string) ($book->created_at->timestamp * 1000 - 95),
                'downloadUrl' => 'UNKNOW',
                'favorite' => '',
                'filename' => $book->filename,
                'groupBooks' => [],
                'groupName' => '',
                'rate' => '',
            ];
        })->values()->all();

        $json = json_encode($syncData, JSON_UNESCAPED_UNICODE);

        return gzcompress($json);
    }

    public function getSize(): int
    {
        return strlen($this->generateBooksSync());
    }

    public function getETag(): ?string
    {
        // ETag based on latest book update
        $latestBook = Book::where('user_id', $this->user->id)
            ->orderBy('updated_at', 'desc')
            ->first();

        $timestamp = $latestBook ? $latestBook->updated_at->timestamp : time();

        return '"books-sync-' . $this->user->id . '-' . $timestamp . '"';
    }

    public function getContentType(): ?string
    {
        return 'application/octet-stream';
    }

    public function getLastModified(): ?int
    {
        $latestBook = Book::where('user_id', $this->user->id)
            ->orderBy('updated_at', 'desc')
            ->first();

        return $latestBook ? $latestBook->updated_at->timestamp : time();
    }

    public function put($data): ?string
    {
        // Allow Moon+ Reader to upload its own books.sync
        // We store it but our generated version takes precedence on GET
        if (is_resource($data)) {
            $data = stream_get_contents($data);
        }

        $directory = dirname($this->storagePath);
        if (!Storage::exists($directory)) {
            Storage::makeDirectory($directory);
        }

        Storage::put($this->storagePath, $data);

        return null;
    }

    public function delete(): void
    {
        if (Storage::exists($this->storagePath)) {
            Storage::delete($this->storagePath);
        }
    }
}
