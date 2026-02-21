<?php

namespace App\Facades;

use App\Services\SettingsService;
use Illuminate\Support\Facades\Facade;

/**
 * @method static mixed get(string $key, ?int $userId = null)
 * @method static bool setSystem(string $key, mixed $value)
 * @method static bool setUser(string $key, int $userId, mixed $value)
 * @method static bool resetUser(string $key, int $userId)
 * @method static bool hasUserOverride(string $key, int $userId)
 * @method static array getCategory(string $category, ?int $userId = null)
 * @method static array getAll(?int $userId = null, bool $onlyUserOverridable = false)
 * @method static array validateValue(string $key, mixed $value)
 *
 * @see \App\Services\SettingsService
 */
class Settings extends Facade
{
    protected static function getFacadeAccessor(): string
    {
        return SettingsService::class;
    }
}
