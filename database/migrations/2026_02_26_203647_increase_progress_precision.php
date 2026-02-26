<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Increase progress precision from decimal(5,2) to decimal(8,5)
     * to avoid losing pages when syncing reading position.
     * Before: 58.41 (2 decimals = ~0.5 page precision on 500-page book)
     * After:  58.41209 (5 decimals = much finer precision)
     */
    public function up(): void
    {
        Schema::table('books', function (Blueprint $table) {
            $table->decimal('progress', 8, 5)->default(0)->change();
        });

        Schema::table('reading_sessions', function (Blueprint $table) {
            $table->decimal('progress_before', 8, 5)->default(0)->change();
            $table->decimal('progress_after', 8, 5)->default(0)->change();
        });

        Schema::table('book_sync_identifiers', function (Blueprint $table) {
            $table->decimal('last_progress', 8, 5)->default(0)->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('books', function (Blueprint $table) {
            $table->decimal('progress', 5, 2)->default(0)->change();
        });

        Schema::table('reading_sessions', function (Blueprint $table) {
            $table->decimal('progress_before', 5, 2)->default(0)->change();
            $table->decimal('progress_after', 5, 2)->default(0)->change();
        });

        Schema::table('book_sync_identifiers', function (Blueprint $table) {
            $table->decimal('last_progress', 5, 2)->default(0)->change();
        });
    }
};
