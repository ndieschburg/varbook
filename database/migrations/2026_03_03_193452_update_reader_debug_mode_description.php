<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('settings_definitions')
            ->where('key', 'reader.debug_mode')
            ->update([
                'description' => 'Enable debug logging for EPUB reader and offline sync. Exposes epub.js objects to browser console.',
            ]);
    }

    public function down(): void
    {
        DB::table('settings_definitions')
            ->where('key', 'reader.debug_mode')
            ->update([
                'description' => 'Expose epub.js objects (epubBook, epubRendition) to browser console for debugging',
            ]);
    }
};
