<?php

namespace App\Services\WebDav;

use App\Models\Book;
use App\Models\User;
use App\Services\EpubService;
use Sabre\DAV\Collection;
use Sabre\DAV\Exception\NotFound;
use Sabre\DAV\ICollection;

class BooksDirectory extends Collection implements ICollection
{
    protected EpubService $epubService;

    public function __construct(
        protected User $user
    ) {
        $this->epubService = app(EpubService::class);
    }

    public function getName(): string
    {
        return 'Books';
    }

    public function getChildren(): array
    {
        $books = Book::where('user_id', $this->user->id)
            ->orderBy('title')
            ->get();

        return $books->map(fn (Book $book) => new BookFile($book, $this->epubService))->all();
    }

    public function getChild($name): BookFile
    {
        $book = Book::where('user_id', $this->user->id)
            ->where('filename', $name)
            ->first();

        if (!$book) {
            throw new NotFound("Book not found: {$name}");
        }

        return new BookFile($book, $this->epubService);
    }

    public function childExists($name): bool
    {
        return Book::where('user_id', $this->user->id)
            ->where('filename', $name)
            ->exists();
    }
}
