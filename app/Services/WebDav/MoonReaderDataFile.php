<?php

namespace App\Services\WebDav;

use App\Models\User;
use App\Services\EpubService;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Sabre\DAV\File;

/**
 * Handles Moon+ Reader data files (sync data, covers, sorts, etc.)
 * These files are stored in the user's private storage.
 */
class MoonReaderDataFile extends File
{
    protected string $storagePath;

    public function __construct(
        protected string $name,
        protected User $user,
        protected string $fullPath
    ) {
        // Store Moon+ Reader data files in user-specific directory
        $this->storagePath = "moon-reader/{$user->id}/{$fullPath}";
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function get()
    {
        if (!Storage::exists($this->storagePath)) {
            return '';
        }

        return Storage::get($this->storagePath);
    }

    public function getSize(): int
    {
        if (!Storage::exists($this->storagePath)) {
            return 0;
        }

        return Storage::size($this->storagePath);
    }

    public function getETag(): ?string
    {
        if (!Storage::exists($this->storagePath)) {
            return null;
        }

        return '"' . md5(Storage::get($this->storagePath)) . '"';
    }

    public function getContentType(): ?string
    {
        $extension = strtolower(pathinfo($this->name, PATHINFO_EXTENSION));

        return match ($extension) {
            'png' => 'image/png',
            'jpg', 'jpeg' => 'image/jpeg',
            'json' => 'application/json',
            'epub' => 'application/epub+zip',
            default => 'application/octet-stream',
        };
    }

    public function getLastModified(): ?int
    {
        if (!Storage::exists($this->storagePath)) {
            return time();
        }

        return Storage::lastModified($this->storagePath);
    }

    public function put($data): ?string
    {
        if (is_resource($data)) {
            $data = stream_get_contents($data);
        }

        // Ensure directory exists
        $directory = dirname($this->storagePath);
        if (!Storage::exists($directory)) {
            Storage::makeDirectory($directory);
        }

        Storage::put($this->storagePath, $data);

        // If this is an epub file, import it into the library
        if (preg_match('/\.epub$/i', $this->name)) {
            $this->importEpub();
        }

        // If this is a cover image, associate it with the corresponding book
        if (preg_match('/Cover\/(.+\.epub)_\d+\.(png|jpg|jpeg)$/i', $this->fullPath, $matches)) {
            $this->associateCover($matches[1]);
        }

        return null;
    }

    /**
     * Import the uploaded epub into the user's library.
     */
    protected function importEpub(): void
    {
        try {
            $epubService = app(EpubService::class);
            $filePath = Storage::path($this->storagePath);

            $book = $epubService->importFromPath($filePath, $this->name, $this->user);

            if ($book) {
                Log::channel('webdav')->info('Imported book from Moon+ Reader', [
                    'book_id' => $book->id,
                    'title' => $book->title,
                    'filename' => $this->name,
                ]);

                // Check if Moon+ Reader already uploaded a cover for this book
                if (!$book->cover_path) {
                    $this->findAndAssociateMoonCover($book);
                }

                // Delete the temporary Moon+ Reader file (now stored in library)
                Storage::delete($this->storagePath);
            }
        } catch (\Exception $e) {
            Log::channel('webdav')->error('Failed to import book from Moon+ Reader', [
                'filename' => $this->name,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Find and associate a Moon+ Reader cover that was uploaded before the epub.
     */
    protected function findAndAssociateMoonCover(\App\Models\Book $book): void
    {
        // Moon+ Reader stores covers as: Cover/{filename}_2.png (or _1, _3, etc.)
        $coverPattern = "moon-reader/{$this->user->id}/Apps/Books/.Moon+/Cover/{$this->name}_";

        // Check for common cover suffixes
        foreach (['2.png', '1.png', '2.jpg', '1.jpg'] as $suffix) {
            $coverPath = $coverPattern . $suffix;
            if (Storage::exists($coverPath)) {
                $this->associateCoverFromPath($book, $coverPath);
                return;
            }
        }
    }

    /**
     * Associate a cover from a storage path to a book.
     */
    protected function associateCoverFromPath(\App\Models\Book $book, string $storagePath): void
    {
        try {
            $imageContent = Storage::get($storagePath);
            $finfo = new \finfo(FILEINFO_MIME_TYPE);
            $mimeType = $finfo->buffer($imageContent);
            $extension = match ($mimeType) {
                'image/jpeg' => 'jpg',
                'image/png' => 'png',
                'image/gif' => 'gif',
                'image/webp' => 'webp',
                default => 'jpg',
            };

            $coverPath = config('bookshelf.covers_path') . "/{$this->user->id}/{$book->file_hash}.{$extension}";
            Storage::disk('public')->put($coverPath, $imageContent);
            $book->update(['cover_path' => $coverPath]);

            // Delete the temporary Moon+ Reader cover
            Storage::delete($storagePath);

            Log::channel('webdav')->info('Associated cover from Moon+ Reader (post-import)', [
                'book_id' => $book->id,
                'title' => $book->title,
                'cover_path' => $coverPath,
            ]);
        } catch (\Exception $e) {
            Log::channel('webdav')->error('Failed to associate cover post-import', [
                'book_id' => $book->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Associate an uploaded cover image with the corresponding book.
     */
    protected function associateCover(string $epubFilename): void
    {
        try {
            $book = \App\Models\Book::where('user_id', $this->user->id)
                ->where('filename', $epubFilename)
                ->whereNull('cover_path')
                ->first();

            if (!$book) {
                return;
            }

            // Get the image content and determine extension
            $imageContent = Storage::get($this->storagePath);
            $finfo = new \finfo(FILEINFO_MIME_TYPE);
            $mimeType = $finfo->buffer($imageContent);
            $extension = match ($mimeType) {
                'image/jpeg' => 'jpg',
                'image/png' => 'png',
                'image/gif' => 'gif',
                'image/webp' => 'webp',
                default => 'jpg',
            };

            // Store cover in public storage
            $coverPath = config('bookshelf.covers_path') . "/{$this->user->id}/{$book->file_hash}.{$extension}";
            Storage::disk('public')->put($coverPath, $imageContent);

            // Update book with cover path
            $book->update(['cover_path' => $coverPath]);

            // Delete the temporary Moon+ Reader file (now stored in public)
            Storage::delete($this->storagePath);

            Log::channel('webdav')->info('Associated cover from Moon+ Reader', [
                'book_id' => $book->id,
                'title' => $book->title,
                'cover_path' => $coverPath,
            ]);
        } catch (\Exception $e) {
            Log::channel('webdav')->error('Failed to associate cover from Moon+ Reader', [
                'epub_filename' => $epubFilename,
                'error' => $e->getMessage(),
            ]);
        }
    }

    public function delete(): void
    {
        if (Storage::exists($this->storagePath)) {
            Storage::delete($this->storagePath);
        }
    }
}
