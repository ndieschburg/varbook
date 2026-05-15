<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ApiToken;
use App\Models\TokenPairingCode;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Crypt;

class PairingCodeController extends Controller
{
    /**
     * POST /api/tokens/pairing-code
     *
     * Generate a pairing code for a new API token.
     * The code is 5 digits, valid for 2 minutes.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
        ]);

        TokenPairingCode::pruneExpired();

        $result = ApiToken::generateForUser(Auth::user(), $validated['name']);
        $code = TokenPairingCode::generateUniqueCode();
        $expiresAt = now()->addMinutes(2);

        TokenPairingCode::create([
            'user_id' => Auth::id(),
            'api_token_id' => $result['model']->id,
            'code' => $code,
            'encrypted_token' => Crypt::encryptString($result['plain_token']),
            'expires_at' => $expiresAt,
        ]);

        return response()->json([
            'message' => __('Pairing code generated'),
            'data' => [
                'code' => $code,
                'expires_at' => $expiresAt->toIso8601String(),
                'expires_in_seconds' => 120,
                'device_name' => $validated['name'],
            ],
        ], 201);
    }

    /**
     * POST /api/pairing/claim
     *
     * Claim a pairing code to receive the associated API token.
     * Public endpoint (no auth required), rate limited.
     */
    public function claim(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'regex:/^\d{5}$/'],
        ]);

        $pairingCode = TokenPairingCode::findActiveByCode($validated['code']);

        if (! $pairingCode) {
            return response()->json([
                'message' => __('Invalid or expired pairing code'),
            ], 404);
        }

        $plainToken = $pairingCode->getPlainToken();
        $pairingCode->markClaimed();

        return response()->json([
            'message' => __('Pairing successful'),
            'data' => [
                'token' => $plainToken,
            ],
        ]);
    }
}
