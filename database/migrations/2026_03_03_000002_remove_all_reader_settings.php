<?php

use App\Services\SettingsManager;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Remove remaining reader settings from database.
     * All reader settings are device-specific and stored in localStorage,
     * they should not be synced via the settings API.
     */
    public function up(): void
    {
        $settingsToRemove = [
            'reader.font_size',
            'reader.font_family',
            'reader.theme',
            'reader.line_height',
            'reader.debug_mode',
        ];

        foreach ($settingsToRemove as $key) {
            SettingsManager::remove($key);
        }
    }

    public function down(): void
    {
        // Re-create the removed settings
        SettingsManager::define('reader.font_size', [
            'category' => 'reader',
            'type' => 'number',
            'label_en' => 'Font size',
            'description_en' => 'Default font size in pixels for the EPUB reader',
            'default_value' => 16,
            'validation_rules' => ['min' => 8, 'max' => 72, 'step' => 1],
            'is_user_overridable' => true,
            'sort_order' => 10,
        ]);

        SettingsManager::define('reader.font_family', [
            'category' => 'reader',
            'type' => 'select',
            'label_en' => 'Font family',
            'description_en' => 'Default font for reading',
            'default_value' => 'system',
            'options' => [
                ['value' => 'system', 'label_en' => 'System Default'],
                ['value' => 'serif', 'label_en' => 'Serif'],
                ['value' => 'sans-serif', 'label_en' => 'Sans-serif'],
                ['value' => 'monospace', 'label_en' => 'Monospace'],
            ],
            'is_user_overridable' => true,
            'sort_order' => 20,
        ]);

        SettingsManager::define('reader.theme', [
            'category' => 'reader',
            'type' => 'select',
            'label_en' => 'Reader theme',
            'description_en' => 'Color theme for reading',
            'default_value' => 'dark',
            'options' => [
                ['value' => 'light', 'label_en' => 'Light'],
                ['value' => 'dark', 'label_en' => 'Dark'],
                ['value' => 'sepia', 'label_en' => 'Sepia'],
            ],
            'is_user_overridable' => true,
            'sort_order' => 30,
        ]);

        SettingsManager::define('reader.line_height', [
            'category' => 'reader',
            'type' => 'number',
            'label_en' => 'Line height',
            'description_en' => 'Line spacing multiplier',
            'default_value' => 1.6,
            'validation_rules' => ['min' => 1.0, 'max' => 3.0, 'step' => 0.1],
            'is_user_overridable' => true,
            'sort_order' => 40,
        ]);

        SettingsManager::define('reader.debug_mode', [
            'category' => 'reader',
            'type' => 'checkbox',
            'label_en' => 'Debug mode',
            'label_fr' => 'Mode debug',
            'label_es' => 'Modo depuración',
            'description_en' => 'Expose epub.js objects (epubBook, epubRendition) to browser console for debugging',
            'description_fr' => 'Expose les objets epub.js (epubBook, epubRendition) dans la console du navigateur pour le débogage',
            'description_es' => 'Exponer objetos epub.js (epubBook, epubRendition) en la consola del navegador para depuración',
            'default_value' => false,
            'is_user_overridable' => true,
            'sort_order' => 200,
        ]);
    }
};
