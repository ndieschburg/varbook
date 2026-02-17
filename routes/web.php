<?php

use App\Http\Controllers\BookController;
use App\Http\Controllers\OpdsController;
use App\Http\Controllers\WebDavController;
use Illuminate\Support\Facades\Route;

// Redirect root to library
Route::redirect('/', '/library');

// Authenticated routes
Route::middleware(['auth'])->group(function () {
    // Library
    Route::view('library', 'library')->name('library');

    // Dashboard redirect to library
    Route::redirect('dashboard', '/library')->name('dashboard');

    // Books
    Route::get('books/{book}', [BookController::class, 'show'])->name('books.show');
    Route::get('books/{book}/download', [BookController::class, 'download'])->name('books.download');
    Route::delete('books/{book}', [BookController::class, 'destroy'])->name('books.destroy');

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

// WebDAV routes
Route::any('/webdav/{path?}', WebDavController::class)
    ->where('path', '.*')
    ->middleware(['basic.auth'])
    ->name('webdav');

require __DIR__.'/auth.php';
