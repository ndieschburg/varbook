<?php

namespace App\Services;

use App\Models\Book;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Kiwilan\Ebook\Ebook;

class EpubService
{
    public function processUpload(UploadedFile $file, User $user): Book
    {
        $fileHash = md5_file($file->getRealPath());
        $fileSize = $file->getSize();
        $originalFilename = $file->getClientOriginalName();

        // Check if book already exists for this user
        $existingBook = Book::where('user_id', $user->id)
            ->where('file_hash', $fileHash)
            ->first();

        if ($existingBook) {
            throw new \Exception('This book already exists in your library.');
        }

        // Parse EPUB metadata
        $ebook = Ebook::read($file->getRealPath());
        $metadata = $this->extractMetadata($ebook);

        // Store the EPUB file
        $storagePath = $this->storeEpub($file, $user->id, $fileHash);

        // Extract and store cover
        $coverPath = $this->extractCover($ebook, $user->id, $fileHash);

        // Create book record
        return Book::create([
            'user_id' => $user->id,
            'title' => $metadata['title'] ?? pathinfo($originalFilename, PATHINFO_FILENAME),
            'author' => $metadata['author'],
            'description' => $metadata['description'],
            'language' => $metadata['language'],
            'publisher' => $metadata['publisher'],
            'isbn' => $metadata['isbn'],
            'filename' => $originalFilename,
            'storage_path' => $storagePath,
            'cover_path' => $coverPath,
            'file_hash' => $fileHash,
            'file_size' => $fileSize,
            'progress' => 0,
            'total_reading_seconds' => 0,
            'is_finished' => false,
        ]);
    }

    protected function extractMetadata(Ebook $ebook): array
    {
        $authors = $ebook->getAuthors();
        $authorNames = [];

        if ($authors) {
            foreach ($authors as $author) {
                $authorNames[] = $author->getName();
            }
        }

        $identifiers = $ebook->getIdentifiers();
        $isbn = null;

        if ($identifiers) {
            foreach ($identifiers as $identifier) {
                $value = $identifier->getValue();
                if (preg_match('/^(978|979)?\d{9}[\dX]$/i', preg_replace('/[^0-9X]/i', '', $value))) {
                    $isbn = $value;
                    break;
                }
            }
        }

        return [
            'title' => $ebook->getTitle(),
            'author' => !empty($authorNames) ? implode(', ', $authorNames) : null,
            'description' => $ebook->getDescription(),
            'language' => $ebook->getLanguage(),
            'publisher' => $ebook->getPublisher(),
            'isbn' => $isbn,
        ];
    }

    protected function storeEpub(UploadedFile $file, int $userId, string $fileHash): string
    {
        $path = config('bookshelf.books_path') . "/{$userId}";
        $filename = "{$fileHash}.epub";

        Storage::putFileAs($path, $file, $filename);

        return "{$path}/{$filename}";
    }

    protected function extractCover(Ebook $ebook, int $userId, string $fileHash): ?string
    {
        $cover = $ebook->getCover();

        if (!$cover || !$cover->getContents()) {
            return null;
        }

        $extension = $this->getImageExtension($cover->getContents());
        $path = config('bookshelf.covers_path') . "/{$userId}";
        $filename = "{$fileHash}.{$extension}";
        $fullPath = "{$path}/{$filename}";

        Storage::disk('public')->put($fullPath, $cover->getContents());

        return $fullPath;
    }

    protected function getImageExtension(string $contents): string
    {
        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $mimeType = $finfo->buffer($contents);

        return match ($mimeType) {
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/gif' => 'gif',
            'image/webp' => 'webp',
            default => 'jpg',
        };
    }

    public function deleteBook(Book $book): void
    {
        // Delete EPUB file
        if ($book->storage_path && Storage::exists($book->storage_path)) {
            Storage::delete($book->storage_path);
        }

        // Delete cover image
        if ($book->cover_path && Storage::disk('public')->exists($book->cover_path)) {
            Storage::disk('public')->delete($book->cover_path);
        }

        // Delete database record
        $book->delete();
    }

    public function getEpubPath(Book $book): string
    {
        return Storage::path($book->storage_path);
    }
}
