<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BookController;
use App\Http\Controllers\Api\EmailVerificationController;
use App\Http\Controllers\Api\PasswordResetController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\StatsController;
use App\Http\Controllers\Api\Admin\ProgressLogsController as AdminProgressLogsController;
use App\Http\Controllers\Api\Admin\SettingsController as AdminSettingsController;
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
Route::get('/registration-status', [AuthController::class, 'registrationStatus']);
Route::get('/public-config', [AuthController::class, 'publicConfig']);
Route::post('/register', [AuthController::class, 'register']);

// Password reset routes (public)
Route::post('/forgot-password', [PasswordResetController::class, 'forgotPassword'])
    ->middleware('guest')
    ->name('password.email');
Route::post('/reset-password', [PasswordResetController::class, 'resetPassword'])
    ->middleware('guest')
    ->name('password.store');

// Authenticated routes
Route::middleware('auth:sanctum')->group(function () {
    // Auth
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);
    Route::put('/user/locale', [AuthController::class, 'updateLocale']);
    Route::put('/user/profile-information', [AuthController::class, 'updateProfile']);
    Route::put('/user/password', [AuthController::class, 'updatePassword']);

    // Email verification
    Route::get('/email/verification-status', [EmailVerificationController::class, 'status']);
    Route::post('/email/verification-notification', [EmailVerificationController::class, 'resend'])
        ->middleware('throttle:6,1');

    // User Stats
    Route::get('/stats', [StatsController::class, 'index'])->name('api.stats');

    // Books
    Route::apiResource('books', BookController::class)->except(['update'])->names('api.books');
    Route::get('/books/{book}/download', [BookController::class, 'download'])->name('api.books.download');
    Route::get('/books/{book}/cover', [BookController::class, 'cover'])->name('api.books.cover');
    Route::get('/books/{book}/sessions', [BookController::class, 'sessions'])->name('api.books.sessions');

    // Reading Progress Sync
    Route::get('/books/{book}/progress', [BookController::class, 'getProgress'])->name('api.books.progress.get');
    Route::put('/books/{book}/progress', [BookController::class, 'updateProgress'])->name('api.books.progress.update');
    Route::post('/books/{book}/progress', [BookController::class, 'updateProgress'])->name('api.books.progress.beacon'); // For sendBeacon (POST only)
    Route::post('/books/{book}/progress/batch', [BookController::class, 'batchProgress'])->name('api.books.progress.batch');
    Route::delete('/books/{book}/stats', [BookController::class, 'resetStats'])->name('api.books.stats.reset');

    // User Settings
    Route::get('/settings', [SettingsController::class, 'index'])->name('api.settings.index');
    Route::put('/settings/{key}', [SettingsController::class, 'update'])->name('api.settings.update');
    Route::delete('/settings/{key}', [SettingsController::class, 'destroy'])->name('api.settings.destroy');

    // Admin Routes
    Route::middleware('admin')->prefix('admin')->name('api.admin.')->group(function () {
        Route::apiResource('users', AdminUserController::class);
        Route::get('/stats', [AdminStatsController::class, 'index'])->name('stats');
        Route::get('/settings', [AdminSettingsController::class, 'index'])->name('settings.index');
        Route::put('/settings/{key}', [AdminSettingsController::class, 'update'])->name('settings.update');

        // Progress Logs
        Route::get('/progress-logs', [AdminProgressLogsController::class, 'index'])->name('progress-logs.index');
        Route::get('/progress-logs/stats', [AdminProgressLogsController::class, 'stats'])->name('progress-logs.stats');
        Route::get('/progress-logs/{progressLog}', [AdminProgressLogsController::class, 'show'])->name('progress-logs.show');
        Route::delete('/progress-logs', [AdminProgressLogsController::class, 'destroy'])->name('progress-logs.destroy');
    });
});
