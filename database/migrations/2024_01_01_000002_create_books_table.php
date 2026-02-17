<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('books', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->string('author')->nullable();
            $table->text('description')->nullable();
            $table->string('language', 10)->nullable();
            $table->string('publisher')->nullable();
            $table->string('isbn', 20)->nullable();
            $table->string('filename');
            $table->string('storage_path');
            $table->string('cover_path')->nullable();
            $table->string('file_hash', 32);
            $table->unsignedBigInteger('file_size');
            $table->decimal('progress', 5, 2)->default(0);
            $table->unsignedInteger('total_reading_seconds')->default(0);
            $table->boolean('is_finished')->default(false);
            $table->timestamps();

            $table->index(['user_id', 'title']);
            $table->index(['user_id', 'author']);
            $table->index('file_hash');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('books');
    }
};
