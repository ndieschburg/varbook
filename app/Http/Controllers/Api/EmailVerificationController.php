<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EmailVerificationController extends Controller
{
    /**
     * GET /api/email/verification-status
     * Check if current user's email is verified
     */
    public function status(Request $request): JsonResponse
    {
        return response()->json([
            'verified' => $request->user()->hasVerifiedEmail(),
            'email' => $request->user()->email,
        ]);
    }

    /**
     * POST /api/email/verification-notification
     * Resend verification email
     */
    public function resend(Request $request): JsonResponse
    {
        if ($request->user()->hasVerifiedEmail()) {
            return response()->json([
                'message' => __('Email already verified'),
            ]);
        }

        $request->user()->sendEmailVerificationNotification();

        return response()->json([
            'message' => __('Verification link sent'),
        ]);
    }
}
