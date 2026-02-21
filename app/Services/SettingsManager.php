<?php

namespace App\Services;

use App\Models\SettingDefinition;
use App\Models\SettingValue;
use Illuminate\Support\Facades\DB;

class SettingsManager
{
    /**
     * Define a new setting in the database.
     * Uses updateOrCreate to be idempotent.
     *
     * @param string $key The setting key (e.g., 'reader.font_size')
     * @param array $options Setting options:
     *   - category: string (required)
     *   - type: string (required) - text, textarea, number, checkbox, select, multiselect, color
     *   - label_en: string (required) - English label (stored in DB as fallback)
     *   - label_fr: string (optional) - French label (will be stored in translations)
     *   - label_es: string (optional) - Spanish label (will be stored in translations)
     *   - description_en: string|null - English description
     *   - description_fr: string|null - French description
     *   - description_es: string|null - Spanish description
     *   - default_value: mixed (required)
     *   - options: array|null - For select/multiselect types
     *   - validation_rules: array|null - Validation constraints
     *   - is_user_overridable: bool (default: true)
     *   - sort_order: int (default: 0)
     */
    public static function define(string $key, array $options): SettingDefinition
    {
        $data = [
            'category' => $options['category'],
            'type' => $options['type'],
            'label' => $options['label_en'],
            'description' => $options['description_en'] ?? null,
            'default_value' => json_encode($options['default_value']),
            'options' => isset($options['options']) ? json_encode(self::formatOptions($options['options'])) : null,
            'validation_rules' => isset($options['validation_rules']) ? json_encode($options['validation_rules']) : null,
            'is_user_overridable' => $options['is_user_overridable'] ?? true,
            'sort_order' => $options['sort_order'] ?? 0,
        ];

        return SettingDefinition::updateOrCreate(
            ['key' => $key],
            $data
        );
    }

    /**
     * Remove a setting definition and all its values.
     */
    public static function remove(string $key): bool
    {
        $definition = SettingDefinition::where('key', $key)->first();

        if (!$definition) {
            return false;
        }

        // Cascade delete will handle values
        return $definition->delete();
    }

    /**
     * Set the system-level value for a setting.
     * Usually called from migrations to set initial values from .env.
     */
    public static function setSystemValue(string $key, mixed $value): ?SettingValue
    {
        $definition = SettingDefinition::where('key', $key)->first();

        if (!$definition) {
            return null;
        }

        return SettingValue::updateOrCreate(
            [
                'setting_definition_id' => $definition->id,
                'user_id' => null,
            ],
            [
                'value' => json_encode($value),
            ]
        );
    }

    /**
     * Format options array for storage.
     * Converts multilingual labels to simple label format for DB storage.
     */
    protected static function formatOptions(array $options): array
    {
        return array_map(function ($option) {
            return [
                'value' => $option['value'],
                'label' => $option['label_en'] ?? $option['label'] ?? $option['value'],
            ];
        }, $options);
    }
}
