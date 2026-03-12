<?php

use App\Services\SettingsManager;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        SettingsManager::define('general.show_landing_page', [
            'category' => 'general',
            'type' => 'checkbox',
            'label_en' => 'Show landing page',
            'description_en' => 'When enabled, unauthenticated visitors see a landing page instead of the login page',
            'default_value' => false,
            'is_user_overridable' => false,
            'sort_order' => 6,
        ]);
    }

    public function down(): void
    {
        SettingsManager::remove('general.show_landing_page');
    }
};
