<?php

namespace App\Console\Commands;

use App\Models\Book;
use App\Services\EpubService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class RehashKoreaderCommand extends Command
{
    protected $signature = 'bookshelf:rehash-koreader';

    protected $description = 'Recalculate KOReader partial MD5 hashes for all existing books';

    public function __construct(
        protected EpubService $epubService
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        $books = Book::whereNull('koreader_file_hash')->get();

        if ($books->isEmpty()) {
            $this->info('All books already have KOReader hashes.');

            return self::SUCCESS;
        }

        $this->info("Recalculating KOReader hashes for {$books->count()} books...");

        $bar = $this->output->createProgressBar($books->count());
        $bar->start();

        $updated = 0;
        $skipped = 0;

        foreach ($books as $book) {
            $filePath = Storage::path($book->storage_path);

            if (! file_exists($filePath)) {
                $this->newLine();
                $this->warn("File not found for book #{$book->id}: {$book->title}");
                $skipped++;
                $bar->advance();

                continue;
            }

            $koreaderHash = $this->epubService->calculateKoreaderHash($filePath);
            $book->update(['koreader_file_hash' => $koreaderHash]);
            $updated++;

            $bar->advance();
        }

        $bar->finish();
        $this->newLine(2);
        $this->info("Done! Updated: {$updated}, Skipped: {$skipped}");

        return self::SUCCESS;
    }
}
