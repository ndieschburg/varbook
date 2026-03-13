<?php

use App\Http\Controllers\Auth\VerifyEmailController;
use Illuminate\Support\Facades\Route;
use Livewire\Volt\Volt;

// Guest routes
Route::middleware('guest')->group(function () {
    // React SPA routes
    Route::view('register', 'spa')->name('register');
    Route::view('login', 'spa')->name('login');

    // Volt routes (no React implementation yet)
    Volt::route('forgot-password', 'pages.auth.forgot-password')
        ->name('password.request');
    Volt::route('reset-password/{token}', 'pages.auth.reset-password')
        ->name('password.reset');
});

// Email verification route (accessible to both guests and authenticated users)
Route::get('verify-email/{id}/{hash}', VerifyEmailController::class)
    ->middleware(['signed', 'throttle:6,1'])
    ->name('verification.verify');

// Auth routes
Route::middleware('auth')->group(function () {
    // React SPA route
    Route::view('verify-email', 'spa')->name('verification.notice');

    // Volt route (no React implementation yet)
    Volt::route('confirm-password', 'pages.auth.confirm-password')
        ->name('password.confirm');
});
