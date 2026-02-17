<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Reading Session Settings
    |--------------------------------------------------------------------------
    */

    // Maximum hours for a single reading session before auto-closing
    'max_session_hours' => env('BOOKSHELF_MAX_SESSION_HOURS', 4),

    // Maximum gap (in minutes) between syncs to consider same session
    'session_gap_minutes' => env('BOOKSHELF_SESSION_GAP_MINUTES', 10),

    // Progress percentage to automatically mark as finished
    'finished_threshold' => env('BOOKSHELF_FINISHED_THRESHOLD', 95),

    /*
    |--------------------------------------------------------------------------
    | Upload Settings
    |--------------------------------------------------------------------------
    */

    // Maximum upload size in megabytes
    'max_upload_size_mb' => env('BOOKSHELF_MAX_UPLOAD_SIZE_MB', 50),

    /*
    |--------------------------------------------------------------------------
    | Storage Settings
    |--------------------------------------------------------------------------
    */

    // Base path for book storage (relative to storage/app)
    'books_path' => 'books',

    // Base path for cover images (relative to storage/app/public)
    'covers_path' => 'covers',
];
