<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Facades\Settings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    /**
     * GET /api/admin/settings
     * Get all settings grouped by category (for admin panel).
     */
    public function index(): JsonResponse
    {
        return response()->json(
            Settings::getAll(userId: null, onlyUserOverridable: false)
        );
    }

    /**
     * PUT /api/admin/settings/{key}
     * Update the system-level value for a setting.
     */
    public function update(Request $request, string $key): JsonResponse
    {
        // Convert URL key format to database key format
        // Only replace the first underscore (category separator) with a dot
        // e.g., "general_progress_logging" -> "general.progress_logging"
        $key = preg_replace('/_/', '.', $key, 1);

        // Validate the value
        $validation = Settings::validateValue($key, $request->input('value'));

        if (!$validation['valid']) {
            return response()->json([
                'message' => __('Validation failed'),
                'errors' => ['value' => $validation['errors']],
            ], 422);
        }

        $success = Settings::setSystem($key, $request->input('value'));

        if (!$success) {
            return response()->json([
                'message' => __('Setting not found'),
            ], 404);
        }

        return response()->json([
            'message' => __('Setting updated'),
            'value' => Settings::get($key),
        ]);
    }
}
