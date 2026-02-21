<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SettingValue extends Model
{
    protected $table = 'settings_values';

    protected $fillable = [
        'setting_definition_id',
        'user_id',
        'value',
    ];

    public function definition(): BelongsTo
    {
        return $this->belongsTo(SettingDefinition::class, 'setting_definition_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the typed value.
     */
    public function getTypedValue(): mixed
    {
        return $this->definition->decodeValue($this->value);
    }

    /**
     * Check if this is a system-level value.
     */
    public function isSystemValue(): bool
    {
        return $this->user_id === null;
    }
}
