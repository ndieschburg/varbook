<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reading_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('book_id')->constrained()->cascadeOnDelete();
            $table->timestamp('started_at');
            $table->timestamp('ended_at');
            $table->unsignedInteger('duration_seconds')->default(0);
            $table->decimal('progress_before', 5, 2)->default(0);
            $table->decimal('progress_after', 5, 2)->default(0);
            $table->string('client', 20);
            $table->json('raw_payload')->nullable();
            $table->timestamps();

            $table->index(['book_id', 'started_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reading_sessions');
    }
};
