<?php

use App\Services\SettingsManager;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        // =====================
        // General Settings
        // =====================

        SettingsManager::define('general.max_upload_size_mb', [
            'category' => 'general',
            'type' => 'number',
            'label_en' => 'Max upload size (MB)',
            'description_en' => 'Maximum file size for EPUB uploads in megabytes',
            'default_value' => 50,
            'validation_rules' => ['min' => 1, 'max' => 500],
            'is_user_overridable' => false,
            'sort_order' => 10,
        ]);

        SettingsManager::define('general.session_gap_minutes', [
            'category' => 'general',
            'type' => 'number',
            'label_en' => 'Session gap (minutes)',
            'description_en' => 'Maximum gap between syncs to consider same reading session',
            'default_value' => 10,
            'validation_rules' => ['min' => 1, 'max' => 60],
            'is_user_overridable' => false,
            'sort_order' => 20,
        ]);

        SettingsManager::define('general.max_session_hours', [
            'category' => 'general',
            'type' => 'number',
            'label_en' => 'Max session hours',
            'description_en' => 'Maximum hours for a single reading session before auto-closing',
            'default_value' => 4,
            'validation_rules' => ['min' => 1, 'max' => 24],
            'is_user_overridable' => false,
            'sort_order' => 30,
        ]);

        SettingsManager::define('general.finished_threshold', [
            'category' => 'general',
            'type' => 'number',
            'label_en' => 'Finished threshold (%)',
            'description_en' => 'Progress percentage to automatically mark book as finished',
            'default_value' => 95,
            'validation_rules' => ['min' => 50, 'max' => 100],
            'is_user_overridable' => false,
            'sort_order' => 40,
        ]);

        // =====================
        // Reader Settings
        // =====================

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

        SettingsManager::define('reader.text_align', [
            'category' => 'reader',
            'type' => 'select',
            'label_en' => 'Text alignment',
            'description_en' => 'How text is aligned in the reader',
            'default_value' => 'justify',
            'options' => [
                ['value' => 'left', 'label_en' => 'Left'],
                ['value' => 'justify', 'label_en' => 'Justify'],
                ['value' => 'right', 'label_en' => 'Right'],
            ],
            'is_user_overridable' => true,
            'sort_order' => 50,
        ]);

        SettingsManager::define('reader.margin_horizontal', [
            'category' => 'reader',
            'type' => 'number',
            'label_en' => 'Horizontal margins',
            'description_en' => 'Side margins in pixels',
            'default_value' => 16,
            'validation_rules' => ['min' => 0, 'max' => 100, 'step' => 4],
            'is_user_overridable' => true,
            'sort_order' => 60,
        ]);

        SettingsManager::define('reader.keep_screen_awake', [
            'category' => 'reader',
            'type' => 'checkbox',
            'label_en' => 'Keep screen awake',
            'description_en' => 'Prevent screen from turning off while reading',
            'default_value' => true,
            'is_user_overridable' => true,
            'sort_order' => 70,
        ]);

        SettingsManager::define('reader.swipe_to_turn', [
            'category' => 'reader',
            'type' => 'checkbox',
            'label_en' => 'Swipe to turn pages',
            'description_en' => 'Enable swipe gestures for page navigation',
            'default_value' => true,
            'is_user_overridable' => true,
            'sort_order' => 80,
        ]);

        SettingsManager::define('reader.tap_to_turn', [
            'category' => 'reader',
            'type' => 'checkbox',
            'label_en' => 'Tap to turn pages',
            'description_en' => 'Enable tap zones for page navigation',
            'default_value' => true,
            'is_user_overridable' => true,
            'sort_order' => 90,
        ]);

        // =====================
        // Library Settings
        // =====================

        SettingsManager::define('library.default_sort', [
            'category' => 'library',
            'type' => 'select',
            'label_en' => 'Default sort',
            'description_en' => 'How books are sorted by default',
            'default_value' => 'recent',
            'options' => [
                ['value' => 'recent', 'label_en' => 'Recent'],
                ['value' => 'title', 'label_en' => 'Title'],
                ['value' => 'author', 'label_en' => 'Author'],
                ['value' => 'progress', 'label_en' => 'Progress'],
            ],
            'is_user_overridable' => true,
            'sort_order' => 10,
        ]);

        SettingsManager::define('library.cards_per_row', [
            'category' => 'library',
            'type' => 'number',
            'label_en' => 'Cards per row',
            'description_en' => 'Number of book cards per row on desktop',
            'default_value' => 4,
            'validation_rules' => ['min' => 2, 'max' => 8, 'step' => 1],
            'is_user_overridable' => true,
            'sort_order' => 20,
        ]);

        SettingsManager::define('library.show_reading_time', [
            'category' => 'library',
            'type' => 'checkbox',
            'label_en' => 'Show reading time',
            'description_en' => 'Display reading time on book cards',
            'default_value' => true,
            'is_user_overridable' => true,
            'sort_order' => 30,
        ]);

        SettingsManager::define('library.show_progress_bar', [
            'category' => 'library',
            'type' => 'checkbox',
            'label_en' => 'Show progress bar',
            'description_en' => 'Display progress bar on book cards',
            'default_value' => true,
            'is_user_overridable' => true,
            'sort_order' => 40,
        ]);

        // =====================
        // Appearance Settings
        // =====================

        SettingsManager::define('appearance.accent_color', [
            'category' => 'appearance',
            'type' => 'color',
            'label_en' => 'Accent color',
            'description_en' => 'Primary accent color for UI elements',
            'default_value' => '#6366f1',
            'is_user_overridable' => true,
            'sort_order' => 10,
        ]);

        SettingsManager::define('appearance.ui_theme', [
            'category' => 'appearance',
            'type' => 'select',
            'label_en' => 'UI theme',
            'description_en' => 'Color theme for the application interface',
            'default_value' => 'dark',
            'options' => [
                ['value' => 'light', 'label_en' => 'Light'],
                ['value' => 'dark', 'label_en' => 'Dark'],
                ['value' => 'system', 'label_en' => 'System'],
            ],
            'is_user_overridable' => true,
            'sort_order' => 20,
        ]);

        // =====================
        // Migrate existing .env values to system settings
        // =====================

        $envSettings = [
            'general.max_upload_size_mb' => env('BOOKSHELF_MAX_UPLOAD_SIZE_MB'),
            'general.session_gap_minutes' => env('BOOKSHELF_SESSION_GAP_MINUTES'),
            'general.max_session_hours' => env('BOOKSHELF_MAX_SESSION_HOURS'),
            'general.finished_threshold' => env('BOOKSHELF_FINISHED_THRESHOLD'),
        ];

        foreach ($envSettings as $key => $value) {
            if ($value !== null) {
                SettingsManager::setSystemValue($key, $value);
            }
        }
    }

    public function down(): void
    {
        // Remove all settings defined in this migration
        $settings = [
            // General
            'general.max_upload_size_mb',
            'general.session_gap_minutes',
            'general.max_session_hours',
            'general.finished_threshold',
            // Reader
            'reader.font_size',
            'reader.font_family',
            'reader.theme',
            'reader.line_height',
            'reader.text_align',
            'reader.margin_horizontal',
            'reader.keep_screen_awake',
            'reader.swipe_to_turn',
            'reader.tap_to_turn',
            // Library
            'library.default_sort',
            'library.cards_per_row',
            'library.show_reading_time',
            'library.show_progress_bar',
            // Appearance
            'appearance.accent_color',
            'appearance.ui_theme',
        ];

        foreach ($settings as $key) {
            SettingsManager::remove($key);
        }
    }
};
