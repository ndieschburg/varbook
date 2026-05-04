<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ApiToken;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ApiTokenController extends Controller
{
    /**
     * GET /api/tokens
     *
     * List all API tokens for the authenticated user.
     */
    public function index(): JsonResponse
    {
        $tokens = ApiToken::where('user_id', Auth::id())
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (ApiToken $token) => [
                'id' => $token->id,
                'name' => $token->name,
                'prefix' => $token->plain_prefix . '...',
                'last_used_at' => $token->last_used_at?->toIso8601String(),
                'created_at' => $token->created_at->toIso8601String(),
            ]);

        return response()->json(['data' => $tokens]);
    }

    /**
     * POST /api/tokens
     *
     * Generate a new API token. The plain token is returned only once.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
        ]);

        $result = ApiToken::generateForUser(Auth::user(), $validated['name']);

        return response()->json([
            'message' => __('Token created successfully'),
            'data' => [
                'id' => $result['model']->id,
                'name' => $result['model']->name,
                'token' => $result['plain_token'],
                'prefix' => $result['model']->plain_prefix . '...',
                'created_at' => $result['model']->created_at->toIso8601String(),
            ],
        ], 201);
    }

    /**
     * DELETE /api/tokens/{id}
     *
     * Revoke (delete) an API token.
     */
    public function destroy(int $id): JsonResponse
    {
        $token = ApiToken::where('user_id', Auth::id())
            ->where('id', $id)
            ->first();

        if (! $token) {
            return response()->json([
                'message' => __('Token not found'),
            ], 404);
        }

        $token->delete();

        return response()->json([
            'message' => __('Token revoked successfully'),
        ]);
    }
}
