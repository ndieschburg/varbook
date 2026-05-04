<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('kosync_password_hash')->nullable()->after('password');
        });

        Schema::table('books', function (Blueprint $table) {
            $table->string('koreader_file_hash', 32)->nullable()->after('file_hash');
            $table->index('koreader_file_hash');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('kosync_password_hash');
        });

        Schema::table('books', function (Blueprint $table) {
            $table->dropIndex(['koreader_file_hash']);
            $table->dropColumn('koreader_file_hash');
        });
    }
};
