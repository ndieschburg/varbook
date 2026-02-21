<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SettingDefinition extends Model
{
    protected $table = 'settings_definitions';

    protected $fillable = [
        'key',
        'category',
        'type',
        'label',
        'description',
        'default_value',
        'options',
        'validation_rules',
        'is_user_overridable',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'options' => 'array',
            'validation_rules' => 'array',
            'is_user_overridable' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function values(): HasMany
    {
        return $this->hasMany(SettingValue::class);
    }

    public function systemValue(): ?SettingValue
    {
        return $this->values()->whereNull('user_id')->first();
    }

    public function userValue(int $userId): ?SettingValue
    {
        return $this->values()->where('user_id', $userId)->first();
    }

    /**
     * Get the typed default value.
     */
    public function getTypedDefaultValue(): mixed
    {
        return $this->decodeValue($this->default_value);
    }

    /**
     * Decode a JSON-encoded value to its proper type.
     */
    public function decodeValue(?string $value): mixed
    {
        if ($value === null) {
            return null;
        }

        $decoded = json_decode($value, true);

        // Handle JSON decode failure (plain string)
        if (json_last_error() !== JSON_ERROR_NONE) {
            return $value;
        }

        return $decoded;
    }

    /**
     * Encode a value for storage.
     */
    public static function encodeValue(mixed $value): string
    {
        return json_encode($value);
    }

    /**
     * Get the translated label.
     */
    public function getTranslatedLabel(?string $locale = null): string
    {
        $locale = $locale ?? app()->getLocale();
        $translationKey = "settings.{$this->key}";

        $translated = __($translationKey);

        // If no translation found, return the fallback label from DB
        return $translated === $translationKey ? $this->label : $translated;
    }

    /**
     * Get the translated description.
     */
    public function getTranslatedDescription(?string $locale = null): ?string
    {
        $locale = $locale ?? app()->getLocale();
        $translationKey = "settings.{$this->key}_description";

        $translated = __($translationKey);

        // If no translation found, return the fallback description from DB
        return $translated === $translationKey ? $this->description : $translated;
    }

    /**
     * Get translated options for select/multiselect types.
     */
    public function getTranslatedOptions(?string $locale = null): ?array
    {
        if (!$this->options) {
            return null;
        }

        $locale = $locale ?? app()->getLocale();

        return array_map(function ($option) use ($locale) {
            $translationKey = "settings.options.{$this->key}.{$option['value']}";
            $translated = __($translationKey);

            return [
                'value' => $option['value'],
                'label' => $translated === $translationKey
                    ? ($option['label'] ?? $option['value'])
                    : $translated,
            ];
        }, $this->options);
    }
}
