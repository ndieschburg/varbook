<?php

use App\Services\SettingsManager;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        SettingsManager::define('general.progress_logging', [
            'category' => 'general',
            'type' => 'checkbox',
            'label_en' => 'Progress logging',
            'description_en' => 'Log all progress sync calls for debugging (admin only)',
            'default_value' => false,
            'is_user_overridable' => false,
            'sort_order' => 50,
        ]);
    }

    public function down(): void
    {
        SettingsManager::remove('general.progress_logging');
    }
};
