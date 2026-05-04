<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'admin' => \App\Http\Middleware\AdminMiddleware::class,
            'basic.auth' => \App\Http\Middleware\BasicAuthMiddleware::class,
            'kosync.auth' => \App\Http\Middleware\KosyncAuthMiddleware::class,
            'varbook.auth' => \App\Http\Middleware\VarbookAuthMiddleware::class,
            'verified' => \App\Http\Middleware\EnsureEmailIsVerified::class,
        ]);

        $middleware->web(append: [
            \App\Http\Middleware\SetLocale::class,
        ]);

        $middleware->api(append: [
            \App\Http\Middleware\SetLocale::class,
        ]);

        $middleware->statefulApi();

        $middleware->validateCsrfTokens(except: [
            'webdav/*',
            'opds/*',
            'api/kosync/*',
            'api/varbook/*',
            'api/books/*/progress', // For sendBeacon (can't send CSRF header)
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
