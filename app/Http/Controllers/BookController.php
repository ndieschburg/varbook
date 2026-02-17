<?php

namespace App\Http\Controllers;

use App\Models\Book;
use App\Services\EpubService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class BookController extends Controller
{
    public function __construct(
        protected EpubService $epubService
    ) {}

    public function show(Book $book)
    {
        // Ensure the book belongs to the authenticated user
        if ($book->user_id !== Auth::id()) {
            abort(403);
        }

        $book->load(['readingSessions' => function ($query) {
            $query->orderBy('started_at', 'desc');
        }]);

        return view('books.show', compact('book'));
    }

    public function download(Book $book)
    {
        // Ensure the book belongs to the authenticated user
        if ($book->user_id !== Auth::id()) {
            abort(403);
        }

        $path = $this->epubService->getEpubPath($book);

        if (!file_exists($path)) {
            abort(404, 'Book file not found.');
        }

        return response()->download($path, $book->filename, [
            'Content-Type' => 'application/epub+zip',
        ]);
    }

    public function destroy(Book $book)
    {
        // Ensure the book belongs to the authenticated user
        if ($book->user_id !== Auth::id()) {
            abort(403);
        }

        $this->epubService->deleteBook($book);

        return redirect()->route('library')
            ->with('message', 'Book deleted successfully.');
    }
}
