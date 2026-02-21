<?php

use App\Facades\Settings;

if (!function_exists('setting')) {
    /**
     * Get a setting value for the authenticated user.
     *
     * @param string $key The setting key (e.g., 'reader.font_size')
     * @param int|null $userId Optional user ID. Defaults to authenticated user.
     * @return mixed
     */
    function setting(string $key, ?int $userId = null): mixed
    {
        $userId = $userId ?? auth()->id();

        return Settings::get($key, $userId);
    }
}
