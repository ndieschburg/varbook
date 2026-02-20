<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BookController;
use App\Http\Controllers\Api\StatsController;
use App\Http\Controllers\Api\Admin\StatsController as AdminStatsController;
use App\Http\Controllers\Api\Admin\UserController as AdminUserController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| These routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group.
|
*/

// Public auth routes
Route::post('/login', [AuthController::class, 'login']);

// Authenticated routes
Route::middleware('auth:sanctum')->group(function () {
    // Auth
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);
    Route::put('/user/locale', [AuthController::class, 'updateLocale']);
    Route::put('/user/profile-information', [AuthController::class, 'updateProfile']);
    Route::put('/user/password', [AuthController::class, 'updatePassword']);

    // User Stats
    Route::get('/stats', [StatsController::class, 'index'])->name('api.stats');

    // Books
    Route::apiResource('books', BookController::class)->except(['update']);
    Route::get('/books/{book}/download', [BookController::class, 'download'])->name('api.books.download');
    Route::get('/books/{book}/cover', [BookController::class, 'cover'])->name('api.books.cover');
    Route::get('/books/{book}/sessions', [BookController::class, 'sessions'])->name('api.books.sessions');

    // Reading Progress Sync
    Route::get('/books/{book}/progress', [BookController::class, 'getProgress'])->name('api.books.progress.get');
    Route::put('/books/{book}/progress', [BookController::class, 'updateProgress'])->name('api.books.progress.update');
    Route::post('/books/{book}/progress/batch', [BookController::class, 'batchProgress'])->name('api.books.progress.batch');

    // Admin Routes
    Route::middleware('admin')->prefix('admin')->name('api.admin.')->group(function () {
        Route::apiResource('users', AdminUserController::class);
        Route::get('/stats', [AdminStatsController::class, 'index'])->name('stats');
    });
});
