<?php

use App\Http\Controllers\BookController;
use App\Http\Controllers\OpdsController;
use App\Http\Controllers\ReaderController;
use App\Http\Controllers\WebDavController;
use Illuminate\Support\Facades\Route;

// Redirect root to library
Route::redirect('/', '/library');

// Language switch
Route::get('locale/{locale}', function (string $locale) {
    if (in_array($locale, ['en', 'fr', 'es'])) {
        session(['locale' => $locale]);
    }

    return redirect()->back();
})->name('locale.switch');

// Authenticated routes
Route::middleware(['auth'])->group(function () {
    // Library
    Route::view('library', 'library')->name('library');

    // Reading Stats Dashboard
    Route::view('stats', 'stats')->name('stats');

    // Dashboard redirect to library
    Route::redirect('dashboard', '/library')->name('dashboard');

    // Books
    Route::get('books/{book}', [BookController::class, 'show'])->name('books.show');
    Route::get('books/{book}/download', [BookController::class, 'download'])->name('books.download');
    Route::delete('books/{book}', [BookController::class, 'destroy'])->name('books.destroy');

    // EPUB Reader
    Route::get('books/{book}/read', [BookController::class, 'read'])->name('books.read');
    Route::get('books/{book}/epub', [BookController::class, 'streamEpub'])->name('books.epub');

    // Reader Position API
    Route::get('api/books/{book}/position', [ReaderController::class, 'getPosition'])->name('api.books.position.get');
    Route::post('api/books/{book}/position', [ReaderController::class, 'savePosition'])->name('api.books.position.save');

    // Profile
    Route::view('profile', 'profile')->name('profile');

    // Admin routes
    Route::middleware(['admin'])->prefix('admin')->name('admin.')->group(function () {
        Route::view('users', 'admin.users')->name('users');
    });
});

// OPDS routes (Basic Auth)
Route::middleware(['basic.auth'])->prefix('opds')->name('opds.')->group(function () {
    Route::get('/', [OpdsController::class, 'root'])->name('root');
    Route::get('/all', [OpdsController::class, 'all'])->name('all');
    Route::get('/by-author', [OpdsController::class, 'authors'])->name('authors');
    Route::get('/by-author/{author}', [OpdsController::class, 'byAuthor'])->name('by-author');
    Route::get('/search', [OpdsController::class, 'search'])->name('search');
    Route::get('/book/{book}/download', [OpdsController::class, 'download'])->name('download');
});

// OPDS token-based download (no auth middleware - token validated in controller)
Route::get('/opds/download/{book}/{token}', [OpdsController::class, 'downloadWithToken'])->name('opds.download.token');

// WebDAV routes (include all WebDAV methods, exclude session middleware)
Route::match(
    ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PROPFIND', 'PROPPATCH', 'MKCOL', 'COPY', 'MOVE', 'LOCK', 'UNLOCK'],
    '/webdav/{path?}',
    WebDavController::class
)
    ->where('path', '.*')
    ->withoutMiddleware([
        \Illuminate\Session\Middleware\StartSession::class,
        \Illuminate\View\Middleware\ShareErrorsFromSession::class,
        \Illuminate\Foundation\Http\Middleware\VerifyCsrfToken::class,
    ])
    ->middleware(['basic.auth'])
    ->name('webdav');

require __DIR__.'/auth.php';
