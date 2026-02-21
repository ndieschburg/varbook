<?php

namespace App\Services;

use App\Models\SettingDefinition;
use App\Models\SettingValue;
use Illuminate\Support\Collection;

class SettingsService
{
    protected array $definitionsCache = [];

    /**
     * Get a setting value for a specific user.
     * Resolution order: User override > System value > Default value
     */
    public function get(string $key, ?int $userId = null): mixed
    {
        $definition = $this->getDefinition($key);

        if (!$definition) {
            return null;
        }

        // Try user override first (if userId provided and setting is overridable)
        if ($userId !== null && $definition->is_user_overridable) {
            $userValue = $definition->userValue($userId);
            if ($userValue) {
                return $userValue->getTypedValue();
            }
        }

        // Try system value
        $systemValue = $definition->systemValue();
        if ($systemValue) {
            return $systemValue->getTypedValue();
        }

        // Return default value
        return $definition->getTypedDefaultValue();
    }

    /**
     * Set the system-level value for a setting.
     */
    public function setSystem(string $key, mixed $value): bool
    {
        $definition = $this->getDefinition($key);

        if (!$definition) {
            return false;
        }

        SettingValue::updateOrCreate(
            [
                'setting_definition_id' => $definition->id,
                'user_id' => null,
            ],
            [
                'value' => SettingDefinition::encodeValue($value),
            ]
        );

        return true;
    }

    /**
     * Set a user override for a setting.
     */
    public function setUser(string $key, int $userId, mixed $value): bool
    {
        $definition = $this->getDefinition($key);

        if (!$definition || !$definition->is_user_overridable) {
            return false;
        }

        SettingValue::updateOrCreate(
            [
                'setting_definition_id' => $definition->id,
                'user_id' => $userId,
            ],
            [
                'value' => SettingDefinition::encodeValue($value),
            ]
        );

        return true;
    }

    /**
     * Reset a user override (fall back to system/default).
     */
    public function resetUser(string $key, int $userId): bool
    {
        $definition = $this->getDefinition($key);

        if (!$definition) {
            return false;
        }

        SettingValue::where('setting_definition_id', $definition->id)
            ->where('user_id', $userId)
            ->delete();

        return true;
    }

    /**
     * Check if user has an override for a setting.
     */
    public function hasUserOverride(string $key, int $userId): bool
    {
        $definition = $this->getDefinition($key);

        if (!$definition) {
            return false;
        }

        return $definition->userValue($userId) !== null;
    }

    /**
     * Get all settings for a category with resolved values.
     */
    public function getCategory(string $category, ?int $userId = null): array
    {
        $definitions = SettingDefinition::where('category', $category)
            ->orderBy('sort_order')
            ->get();

        return $this->formatSettingsResponse($definitions, $userId);
    }

    /**
     * Get all settings grouped by category.
     */
    public function getAll(?int $userId = null, bool $onlyUserOverridable = false): array
    {
        $query = SettingDefinition::orderBy('category')->orderBy('sort_order');

        if ($onlyUserOverridable) {
            $query->where('is_user_overridable', true);
        }

        $definitions = $query->get();

        // Group by category
        $grouped = $definitions->groupBy('category');

        $categories = [];
        $categoryConfig = config('bookshelf.settings_categories', []);

        foreach ($grouped as $categoryKey => $categoryDefinitions) {
            $categoryInfo = $categoryConfig[$categoryKey] ?? [
                'label' => ucfirst($categoryKey),
                'icon' => 'settings',
                'sort' => 99,
            ];

            $categories[] = [
                'key' => $categoryKey,
                'label' => $this->translateCategoryLabel($categoryKey, $categoryInfo['label']),
                'icon' => $categoryInfo['icon'],
                'sort' => $categoryInfo['sort'],
                'settings' => $this->formatSettingsResponse($categoryDefinitions, $userId),
            ];
        }

        // Sort categories by their sort order
        usort($categories, fn($a, $b) => $a['sort'] <=> $b['sort']);

        return ['categories' => $categories];
    }

    /**
     * Get a definition from cache or database.
     */
    protected function getDefinition(string $key): ?SettingDefinition
    {
        if (!isset($this->definitionsCache[$key])) {
            $this->definitionsCache[$key] = SettingDefinition::where('key', $key)->first();
        }

        return $this->definitionsCache[$key];
    }

    /**
     * Format settings for API response.
     */
    protected function formatSettingsResponse(Collection $definitions, ?int $userId): array
    {
        return $definitions->map(function (SettingDefinition $definition) use ($userId) {
            $defaultValue = $definition->getTypedDefaultValue();
            $systemValue = $definition->systemValue()?->getTypedValue() ?? $defaultValue;

            $userValue = null;
            $isOverridden = false;

            if ($userId !== null && $definition->is_user_overridable) {
                $userValueModel = $definition->userValue($userId);
                if ($userValueModel) {
                    $userValue = $userValueModel->getTypedValue();
                    $isOverridden = true;
                }
            }

            $resolvedValue = $isOverridden ? $userValue : $systemValue;

            return [
                'key' => $definition->key,
                'type' => $definition->type,
                'label' => $definition->getTranslatedLabel(),
                'description' => $definition->getTranslatedDescription(),
                'value' => $resolvedValue,
                'default_value' => $defaultValue,
                'system_value' => $systemValue,
                'is_overridden' => $isOverridden,
                'is_user_overridable' => $definition->is_user_overridable,
                'validation_rules' => $definition->validation_rules,
                'options' => $definition->getTranslatedOptions(),
            ];
        })->toArray();
    }

    /**
     * Translate category label.
     */
    protected function translateCategoryLabel(string $categoryKey, string $fallback): string
    {
        $translationKey = "settings.category.{$categoryKey}";
        $translated = __($translationKey);

        return $translated === $translationKey ? $fallback : $translated;
    }

    /**
     * Validate a value against a setting's type and rules.
     */
    public function validateValue(string $key, mixed $value): array
    {
        $definition = $this->getDefinition($key);

        if (!$definition) {
            return ['valid' => false, 'errors' => ['Setting not found']];
        }

        $errors = [];

        // Type validation
        switch ($definition->type) {
            case 'checkbox':
                if (!is_bool($value)) {
                    $errors[] = __('Value must be a boolean');
                }
                break;

            case 'number':
                if (!is_numeric($value)) {
                    $errors[] = __('Value must be a number');
                } else {
                    $rules = $definition->validation_rules ?? [];
                    if (isset($rules['min']) && $value < $rules['min']) {
                        $errors[] = __('Value must be at least :min', ['min' => $rules['min']]);
                    }
                    if (isset($rules['max']) && $value > $rules['max']) {
                        $errors[] = __('Value must be at most :max', ['max' => $rules['max']]);
                    }
                }
                break;

            case 'select':
                $validValues = array_column($definition->options ?? [], 'value');
                if (!in_array($value, $validValues, true)) {
                    $errors[] = __('Invalid selection');
                }
                break;

            case 'multiselect':
                if (!is_array($value)) {
                    $errors[] = __('Value must be an array');
                } else {
                    $validValues = array_column($definition->options ?? [], 'value');
                    foreach ($value as $v) {
                        if (!in_array($v, $validValues, true)) {
                            $errors[] = __('Invalid selection: :value', ['value' => $v]);
                        }
                    }
                }
                break;

            case 'color':
                if (!preg_match('/^#[0-9A-Fa-f]{6}$/', $value)) {
                    $errors[] = __('Invalid color format. Use hex format: #RRGGBB');
                }
                break;

            case 'text':
            case 'textarea':
                if (!is_string($value)) {
                    $errors[] = __('Value must be a string');
                } else {
                    $rules = $definition->validation_rules ?? [];
                    if (isset($rules['maxlength']) && strlen($value) > $rules['maxlength']) {
                        $errors[] = __('Value must be at most :max characters', ['max' => $rules['maxlength']]);
                    }
                }
                break;
        }

        return [
            'valid' => empty($errors),
            'errors' => $errors,
        ];
    }
}
