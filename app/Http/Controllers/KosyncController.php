<?php

namespace App\Http\Controllers;

use App\Models\BookSyncIdentifier;
use App\Models\User;
use App\Services\ProgressLoggingService;
use App\Services\ReadingSessionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class KosyncController extends Controller
{
    public function __construct(
        protected ReadingSessionService $readingSessionService
    ) {}

    /**
     * POST /api/kosync/users/create
     * Register a new user (disabled - use web registration)
     */
    public function createUser(Request $request): JsonResponse
    {
        return response()->json([
            'message' => __('Registration disabled. Please register via the web interface.'),
        ], 403);
    }

    /**
     * GET /api/kosync/users/auth
     * Authenticate user via x-auth-user / x-auth-key headers.
     *
     * KOReader sends md5(password) as x-auth-key, so we verify against
     * the dedicated kosync_password_hash field (bcrypt of md5(password)).
     */
    public function authUser(Request $request): JsonResponse
    {
        $username = $request->header('x-auth-user');
        $authKey = $request->header('x-auth-key');

        if (!$username || !$authKey) {
            return response()->json([
                'message' => __('Unauthorized'),
            ], 401);
        }

        $user = User::where('email', $username)->first();

        if (!$user || !$user->kosync_password_hash || !Hash::check($authKey, $user->kosync_password_hash)) {
            return response()->json([
                'message' => __('Unauthorized'),
            ], 401);
        }

        return response()->json([
            'username' => $user->email,
        ], 200);
    }

    /**
     * GET /api/kosync/healthcheck
     * Simple health check endpoint for KOReader server detection.
     */
    public function healthcheck(): JsonResponse
    {
        return response()->json(['state' => 'OK'], 200);
    }

    /**
     * PUT /api/kosync/syncs/progress
     * Update reading progress for a document
     */
    public function updateProgress(Request $request): JsonResponse
    {
        $user = Auth::user();

        $validated = $request->validate([
            'document' => 'required|string|max:64',
            'progress' => 'required|string',
            'percentage' => 'nullable|numeric|min:0|max:1',
            'device' => 'nullable|string|max:100',
            'device_id' => 'nullable|string|max:100',
        ]);

        $documentHash = $validated['document'];

        // Parse progress - kosync sends it as a string
        $progressPercent = floatval($validated['progress']);

        // Some clients send percentage as 0-1, some as 0-100
        // If percentage field is provided and progress looks like a 0-1 value, use percentage
        if (isset($validated['percentage'])) {
            $progressPercent = floatval($validated['percentage']) * 100;
        }

        // Find book by koreader partial hash
        $book = $this->readingSessionService->findBookByKoreaderHash($user->id, $documentHash);

        if (!$book) {
            return response()->json([
                'message' => __('Document not found'),
            ], 404);
        }

        // Build raw payload for session tracking
        $rawPayload = [
            'source' => 'koreader',
            'device' => $validated['device'] ?? 'KOReader',
            'device_id' => $validated['device_id'] ?? null,
            'document' => $documentHash,
        ];

        ProgressLoggingService::log(
            request: $request,
            action: 'kosync_put',
            bookId: $book->id,
            client: 'koreader',
            requestData: $validated
        );

        // Process sync event using existing service
        $this->readingSessionService->processSyncEvent(
            book: $book,
            client: 'koreader',
            externalIdentifier: $documentHash,
            progress: $progressPercent,
            rawPayload: $rawPayload,
            rawPosition: $validated['progress']
        );

        $timestamp = now()->timestamp;

        return response()->json([
            'document' => $documentHash,
            'timestamp' => $timestamp,
        ], 200);
    }

    /**
     * GET /api/kosync/syncs/progress/{document}
     * Get reading progress for a document
     */
    public function getProgress(Request $request, string $document): JsonResponse
    {
        $user = Auth::user();

        $documentHash = $document;

        // Find book by koreader partial hash
        $book = $this->readingSessionService->findBookByKoreaderHash($user->id, $documentHash);

        if (!$book) {
            return response()->json([
                'message' => __('Document not found'),
            ], 404);
        }

        // Get sync identifier for KOReader
        $syncIdentifier = BookSyncIdentifier::where('book_id', $book->id)
            ->where('client', 'koreader')
            ->first();

        if (!$syncIdentifier) {
            // No KOReader-native position exists yet.
            // Return the book's current progress percentage so KOReader
            // knows reading has happened, but without a raw_position
            // (XPointer) we cannot provide a valid navigation target.
            $responseData = [
                'document' => $documentHash,
                'progress' => '',
                'percentage' => $book->progress / 100,
                'device' => 'Varbook',
                'device_id' => 'varbook-server',
                'timestamp' => $book->updated_at->timestamp,
            ];

            ProgressLoggingService::log(
                request: $request,
                action: 'kosync_get',
                bookId: $book->id,
                client: 'koreader',
                requestData: ['document' => $documentHash],
                responseData: $responseData
            );

            return response()->json($responseData, 200);
        }

        $responseData = [
            'document' => $documentHash,
            'progress' => $syncIdentifier->raw_position,
            'percentage' => $syncIdentifier->last_progress / 100,
            'device' => 'Varbook',
            'device_id' => 'varbook-server',
            'timestamp' => $syncIdentifier->last_sync_at->timestamp,
        ];

        ProgressLoggingService::log(
            request: $request,
            action: 'kosync_get',
            bookId: $book->id,
            client: 'koreader',
            requestData: ['document' => $documentHash],
            responseData: $responseData
        );

        return response()->json($responseData, 200);
    }
}
