<?php

namespace App\Console\Commands;

use App\Models\Book;
use Illuminate\Console\Command;

class ManageDeletedBooksCommand extends Command
{
    protected $signature = 'varbook:deleted-books
                            {--list : List all soft-deleted books}
                            {--undelete= : Restore a soft-deleted book by ID}';

    protected $description = 'List or restore soft-deleted books';

    public function handle(): int
    {
        if ($this->option('list')) {
            return $this->listDeletedBooks();
        }

        if ($this->option('undelete')) {
            return $this->restoreBook((int) $this->option('undelete'));
        }

        $this->error('Please specify --list or --undelete=<id>');

        return self::FAILURE;
    }

    protected function listDeletedBooks(): int
    {
        $books = Book::onlyTrashed()
            ->with('user:id,name')
            ->orderBy('deleted_at', 'desc')
            ->get();

        if ($books->isEmpty()) {
            $this->info('No deleted books found.');

            return self::SUCCESS;
        }

        $this->table(
            ['ID', 'Title', 'Author', 'Owner', 'Progress', 'Reading Time', 'Deleted At'],
            $books->map(fn (Book $book) => [
                $book->id,
                $book->title,
                $book->author ?? '-',
                $book->user?->name ?? 'Unknown',
                $book->progress . '%',
                $book->formatted_reading_time,
                $book->deleted_at->format('Y-m-d H:i'),
            ])
        );

        $this->info("Total: {$books->count()} deleted book(s).");

        return self::SUCCESS;
    }

    protected function restoreBook(int $bookId): int
    {
        $book = Book::onlyTrashed()->find($bookId);

        if (! $book) {
            $this->error("No deleted book found with ID {$bookId}.");

            return self::FAILURE;
        }

        $this->info("Book: {$book->title} by {$book->author}");
        $this->info("Owner: " . ($book->user?->name ?? 'Unknown'));
        $this->info("Deleted at: {$book->deleted_at->format('Y-m-d H:i')}");

        if (! $this->confirm('Restore this book?')) {
            $this->info('Cancelled.');

            return self::SUCCESS;
        }

        $book->restore();

        $this->info("Book '{$book->title}' restored successfully.");

        return self::SUCCESS;
    }
}
