<?php

namespace App\Services\WebDav;

use App\Models\Book;
use App\Services\EpubService;
use Sabre\DAV\File;

class BookFile extends File
{
    public function __construct(
        protected Book $book,
        protected EpubService $epubService
    ) {}

    public function getName(): string
    {
        return $this->book->filename;
    }

    public function get()
    {
        $path = $this->epubService->getEpubPath($this->book);

        if (!file_exists($path)) {
            return '';
        }

        return fopen($path, 'rb');
    }

    public function getSize(): int
    {
        return $this->book->file_size ?? 0;
    }

    public function getETag(): ?string
    {
        return '"' . $this->book->file_hash . '"';
    }

    public function getContentType(): ?string
    {
        return 'application/epub+zip';
    }

    public function getLastModified(): ?int
    {
        return $this->book->updated_at?->timestamp ?? time();
    }
}
