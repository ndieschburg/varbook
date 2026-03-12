<?php

use App\Services\SettingsManager;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        SettingsManager::define('general.allow_registration', [
            'category' => 'general',
            'type' => 'checkbox',
            'label_en' => 'Allow public registration',
            'description_en' => 'When enabled, users can register accounts on the login page',
            'default_value' => false,
            'is_user_overridable' => false,
            'sort_order' => 5,
        ]);
    }

    public function down(): void
    {
        SettingsManager::remove('general.allow_registration');
    }
};
