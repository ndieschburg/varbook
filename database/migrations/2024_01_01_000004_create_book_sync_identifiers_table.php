<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('book_sync_identifiers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('book_id')->constrained()->cascadeOnDelete();
            $table->string('client', 20);
            $table->string('external_identifier');
            $table->timestamp('last_sync_at')->nullable();
            $table->decimal('last_progress', 5, 2)->default(0);
            $table->timestamps();

            $table->unique(['book_id', 'client', 'external_identifier']);
            $table->index(['client', 'external_identifier']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('book_sync_identifiers');
    }
};
