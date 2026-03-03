<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('books', function (Blueprint $table) {
            $table->timestamp('last_read_at')->nullable()->after('is_finished')->index();
        });

        // Populate last_read_at from existing reading sessions
        DB::statement('
            UPDATE books
            SET last_read_at = (
                SELECT MAX(ended_at)
                FROM reading_sessions
                WHERE reading_sessions.book_id = books.id
            )
            WHERE EXISTS (
                SELECT 1 FROM reading_sessions WHERE reading_sessions.book_id = books.id
            )
        ');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('books', function (Blueprint $table) {
            $table->dropColumn('last_read_at');
        });
    }
};
