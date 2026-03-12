<?php

use App\Http\Controllers\BookController;
use App\Http\Controllers\KosyncController;
use App\Http\Controllers\OpdsController;
use App\Http\Controllers\ReaderController;
use App\Http\Controllers\WebDavController;
use Illuminate\Support\Facades\Route;

// Service Worker with proper scope header
Route::get('/build/sw.js', function () {
    $path = public_path('build/sw.js');
    return response()->file($path, [
        'Content-Type' => 'application/javascript',
        'Service-Worker-Allowed' => '/',
    ]);
});

// Root route - serve SPA and let React Router handle the logic
Route::view('/', 'spa')->name('home');

// Language switch
Route::get('locale/{locale}', function (string $locale) {
    if (in_array($locale, ['en', 'fr', 'es'])) {
        session(['locale' => $locale]);
    }

    return redirect()->back();
})->name('locale.switch');

// SPA routes (React app) - serve SPA view for all authenticated routes
Route::middleware(['auth'])->group(function () {
    // Dashboard redirect to library
    Route::redirect('dashboard', '/library')->name('dashboard');

    // SPA routes - all these are handled by React Router
    Route::view('library', 'spa')->name('library');
    Route::view('stats', 'spa')->name('stats');
    Route::view('books/{book}', 'spa')->name('books.show');
    Route::view('books/{book}/read', 'spa')->name('books.read');
    Route::view('profile', 'spa')->name('profile');
    Route::view('settings', 'spa')->name('settings');
    Route::view('admin/users', 'spa')->name('admin.users');
    Route::view('admin/settings', 'spa')->name('admin.settings');
    Route::view('admin/logs', 'spa')->name('admin.logs');

    // API routes that still need server-side handling
    Route::get('books/{book}/download', [BookController::class, 'download'])->name('books.download');
    Route::get('books/{book}/epub', [BookController::class, 'streamEpub'])->name('books.epub');

    // Legacy position API (kept for backward compatibility)
    Route::get('api/books/{book}/position', [ReaderController::class, 'getPosition'])->name('api.books.position.get');
    Route::post('api/books/{book}/position', [ReaderController::class, 'savePosition'])->name('api.books.position.save');
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

// kosync routes (KOReader sync)
Route::prefix('api/kosync')
    ->withoutMiddleware([
        \Illuminate\Session\Middleware\StartSession::class,
        \Illuminate\View\Middleware\ShareErrorsFromSession::class,
        \Illuminate\Foundation\Http\Middleware\VerifyCsrfToken::class,
    ])
    ->group(function () {
        // Public endpoints (no auth required)
        Route::post('users/create', [KosyncController::class, 'createUser']);
        Route::post('users/auth', [KosyncController::class, 'authUser']);

        // Protected endpoints (require kosync auth)
        Route::middleware(['kosync.auth'])->group(function () {
            Route::put('syncs/progress', [KosyncController::class, 'updateProgress']);
            Route::get('syncs/progress', [KosyncController::class, 'getProgress']);
        });
    });

require __DIR__.'/auth.php';
