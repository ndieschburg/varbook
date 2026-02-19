<?php

namespace App\Services\WebDav;

use App\Models\Book;
use App\Models\User;
use App\Services\EpubService;
use Sabre\DAV\Collection;
use Sabre\DAV\ICollection;

class VirtualDirectory extends Collection implements ICollection
{
    protected User $user;
    protected string $name;
    protected string $path;

    public function __construct(User $user, string $name, string $path = '')
    {
        $this->user = $user;
        $this->name = $name;
        $this->path = $path;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function getChildren(): array
    {
        // If this is the Apps/Books directory, return library books for Moon+ Reader download
        if ($this->path === 'Apps/Books') {
            return $this->getLibraryBooks();
        }

        // Return empty array - children are created on demand
        return [];
    }

    /**
     * Get library books as WebDAV files for Moon+ Reader to download.
     */
    protected function getLibraryBooks(): array
    {
        $epubService = app(EpubService::class);
        $books = Book::where('user_id', $this->user->id)->get();

        return $books->map(fn (Book $book) => new BookFile($book, $epubService))->all();
    }

    public function getChild($name): VirtualDirectory|MoonReaderFile|MoonReaderDataFile|BookFile|BooksSyncFile
    {
        $fullPath = $this->path ? "{$this->path}/{$name}" : $name;

        // If this is Apps/Books/.Moon+ and requesting books.sync, generate dynamically
        if ($this->path === 'Apps/Books/.Moon+' && $name === 'books.sync') {
            return new BooksSyncFile($this->user, $fullPath);
        }

        // If this is Apps/Books and requesting an epub, try to serve from library
        if ($this->path === 'Apps/Books' && preg_match('/\.epub$/i', $name)) {
            $book = Book::where('user_id', $this->user->id)
                ->where('filename', $name)
                ->first();

            if ($book) {
                return new BookFile($book, app(EpubService::class));
            }
        }

        // Position sync files (.po, .pos) - handled by MoonReaderFile for reading session tracking
        if (preg_match('/\.(po|pos)$/i', $name)) {
            return new MoonReaderFile($name, null, $this->user, $fullPath);
        }

        // All other data files (.sync, .id, .sorts, .json, images, etc.) - stored as binary data
        if (preg_match('/\.(sync|id|sorts|json|png|jpg|jpeg|gif|epub)$/i', $name)) {
            return new MoonReaderDataFile($name, $this->user, $fullPath);
        }

        // Otherwise return a directory
        return new VirtualDirectory($this->user, $name, $fullPath);
    }

    public function childExists($name): bool
    {
        // Always return true to allow navigation/creation
        return true;
    }

    public function createFile($name, $data = null): ?string
    {
        $fullPath = $this->path ? "{$this->path}/{$name}" : $name;

        // Position sync files (.po, .pos) - handled by MoonReaderFile
        if (preg_match('/\.(po|pos)$/i', $name)) {
            $file = new MoonReaderFile($name, null, $this->user, $fullPath);
        } else {
            // All other files - stored as binary data
            $file = new MoonReaderDataFile($name, $this->user, $fullPath);
        }

        $file->put($data);
        return null;
    }

    public function createDirectory($name): void
    {
        // Virtual directories are created on demand, nothing to do
    }
}
