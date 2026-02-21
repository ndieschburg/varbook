<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('settings_definitions', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->string('category');
            $table->enum('type', ['text', 'textarea', 'number', 'checkbox', 'select', 'multiselect', 'color']);
            $table->string('label');
            $table->string('description')->nullable();
            $table->text('default_value')->nullable();
            $table->text('options')->nullable();
            $table->text('validation_rules')->nullable();
            $table->boolean('is_user_overridable')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->index('category');
        });

        Schema::create('settings_values', function (Blueprint $table) {
            $table->id();
            $table->foreignId('setting_definition_id')->constrained('settings_definitions')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->cascadeOnDelete();
            $table->text('value');
            $table->timestamps();

            $table->unique(['setting_definition_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('settings_values');
        Schema::dropIfExists('settings_definitions');
    }
};
