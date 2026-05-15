<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('token_pairing_codes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('api_token_id')->constrained()->cascadeOnDelete();
            $table->char('code', 5);
            $table->text('encrypted_token');
            $table->timestamp('expires_at');
            $table->timestamp('claimed_at')->nullable();
            $table->timestamps();

            $table->index(['code', 'expires_at']);
            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('token_pairing_codes');
    }
};
