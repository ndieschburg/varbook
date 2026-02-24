<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Facades\Settings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    /**
     * GET /api/settings
     * Get all user-overridable settings grouped by category.
     */
    public function index(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        return response()->json(
            Settings::getAll($userId, onlyUserOverridable: true)
        );
    }

    /**
     * PUT /api/settings/{key}
     * Set a user override for a setting.
     */
    public function update(Request $request, string $key): JsonResponse
    {
        // Convert URL key format to database key format
        // Only replace the first underscore (category separator) with a dot
        // e.g., "reader_font_size" -> "reader.font_size"
        $key = preg_replace('/_/', '.', $key, 1);

        $userId = $request->user()->id;

        // Validate the value
        $validation = Settings::validateValue($key, $request->input('value'));

        if (!$validation['valid']) {
            return response()->json([
                'message' => __('Validation failed'),
                'errors' => ['value' => $validation['errors']],
            ], 422);
        }

        $success = Settings::setUser($key, $userId, $request->input('value'));

        if (!$success) {
            return response()->json([
                'message' => __('Setting not found or not overridable'),
            ], 404);
        }

        return response()->json([
            'message' => __('Setting updated'),
            'value' => Settings::get($key, $userId),
        ]);
    }

    /**
     * DELETE /api/settings/{key}
     * Reset a user override (revert to system/default).
     */
    public function destroy(Request $request, string $key): JsonResponse
    {
        // Convert URL key format to database key format
        // Only replace the first underscore (category separator) with a dot
        $key = preg_replace('/_/', '.', $key, 1);

        $userId = $request->user()->id;

        $success = Settings::resetUser($key, $userId);

        if (!$success) {
            return response()->json([
                'message' => __('Setting not found'),
            ], 404);
        }

        return response()->json([
            'message' => __('Setting reset to default'),
            'value' => Settings::get($key, $userId),
        ]);
    }
}
