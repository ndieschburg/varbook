<?php

namespace App\Http\Controllers;

use App\Models\Book;
use App\Models\DownloadToken;
use App\Services\EpubService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;

class OpdsController extends Controller
{
    public function __construct(
        protected EpubService $epubService
    ) {}

    /**
     * Get the current user's download token.
     */
    protected function getDownloadToken(): string
    {
        $user = Auth::user();
        $token = DownloadToken::getOrCreateForUser($user);

        return $token->token;
    }

    public function root(): Response
    {
        return $this->opdsResponse(view('opds.root', [
            'updated' => now()->toAtomString(),
        ]));
    }

    public function all(Request $request): Response
    {
        $perPage = 20;
        $page = (int) $request->get('page', 1);

        $books = Book::where('user_id', Auth::id())
            ->orderBy('created_at', 'desc')
            ->paginate($perPage, ['*'], 'page', $page);

        return $this->opdsResponse(view('opds.feed', [
            'title' => 'All Books',
            'id' => 'varbook:all',
            'updated' => now()->toAtomString(),
            'books' => $books,
            'selfUrl' => route('opds.all'),
            'nextUrl' => $books->hasMorePages() ? route('opds.all', ['page' => $page + 1]) : null,
            'downloadToken' => $this->getDownloadToken(),
        ]));
    }

    public function authors(): Response
    {
        $authors = Book::where('user_id', Auth::id())
            ->whereNotNull('author')
            ->select('author')
            ->distinct()
            ->orderBy('author')
            ->pluck('author');

        return $this->opdsResponse(view('opds.authors', [
            'title' => 'Authors',
            'id' => 'varbook:authors',
            'updated' => now()->toAtomString(),
            'authors' => $authors,
        ]));
    }

    public function byAuthor(string $author): Response
    {
        $books = Book::where('user_id', Auth::id())
            ->where('author', $author)
            ->orderBy('title')
            ->get();

        return $this->opdsResponse(view('opds.feed', [
            'title' => "Books by {$author}",
            'id' => 'varbook:author:' . urlencode($author),
            'updated' => now()->toAtomString(),
            'books' => $books,
            'selfUrl' => route('opds.by-author', ['author' => $author]),
            'nextUrl' => null,
            'downloadToken' => $this->getDownloadToken(),
        ]));
    }

    public function search(Request $request): Response
    {
        $query = $request->get('q', '');

        $books = Book::where('user_id', Auth::id())
            ->where(function ($q) use ($query) {
                $q->where('title', 'like', "%{$query}%")
                    ->orWhere('author', 'like', "%{$query}%");
            })
            ->orderBy('title')
            ->limit(50)
            ->get();

        return $this->opdsResponse(view('opds.feed', [
            'title' => "Search: {$query}",
            'id' => 'varbook:search:' . urlencode($query),
            'updated' => now()->toAtomString(),
            'books' => $books,
            'selfUrl' => route('opds.search', ['q' => $query]),
            'nextUrl' => null,
            'downloadToken' => $this->getDownloadToken(),
        ]));
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

    public function downloadWithToken(Book $book, string $token)
    {
        $downloadToken = DownloadToken::findValidToken($token);

        if (!$downloadToken) {
            abort(401, 'Invalid or expired token.');
        }

        // Ensure the book belongs to the token's user
        if ($book->user_id !== $downloadToken->user_id) {
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

    protected function opdsResponse($content): Response
    {
        return response($content)
            ->header('Content-Type', 'application/atom+xml; charset=UTF-8');
    }
}
