<?php

namespace App\Http\Controllers\Api;

use App\Facades\Settings;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\LoginRequest;
use App\Http\Requests\Api\RegisterRequest;
use App\Http\Requests\Api\UpdateLocaleRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class AuthController extends Controller
{
    /**
     * GET /api/registration-status
     * Check if registration is enabled (public endpoint)
     */
    public function registrationStatus(): JsonResponse
    {
        return response()->json([
            'enabled' => (bool) Settings::get('general.allow_registration'),
        ]);
    }

    /**
     * POST /api/register
     * Register a new user
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
        ]);

        event(new Registered($user));

        Auth::login($user);

        if ($request->hasSession()) {
            $request->session()->regenerate();
        }

        return response()->json([
            'message' => __('Registration successful. Please check your email to verify your account.'),
            'user' => new UserResource($user),
            'requires_verification' => true,
        ], 201);
    }

    /**
     * POST /api/login
     * Authenticate user and return user data (SPA mode uses cookies)
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $request->authenticate();

        // Regenerate session for stateful SPA requests
        if ($request->hasSession()) {
            $request->session()->regenerate();
        }

        return response()->json([
            'message' => __('Login successful'),
            'user' => new UserResource(Auth::user()),
        ]);
    }

    /**
     * POST /api/logout
     * Invalidate session
     */
    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();

        // Invalidate session for stateful SPA requests
        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->json([
            'message' => __('Logout successful'),
        ]);
    }

    /**
     * GET /api/user
     * Get current authenticated user
     */
    public function user(Request $request): UserResource
    {
        return new UserResource($request->user());
    }

    /**
     * PUT /api/user/locale
     * Update user's locale preference
     */
    public function updateLocale(UpdateLocaleRequest $request): JsonResponse
    {
        $locale = $request->validated('locale');

        if ($request->hasSession()) {
            session(['locale' => $locale]);
        }

        return response()->json([
            'message' => __('Locale updated'),
            'locale' => $locale,
        ]);
    }

    /**
     * PUT /api/user/profile-information
     * Update user's profile information
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email,' . $request->user()->id],
        ]);

        $request->user()->update($validated);

        return response()->json([
            'message' => __('Profile updated'),
            'user' => new UserResource($request->user()),
        ]);
    }

    /**
     * PUT /api/user/password
     * Update user's password
     */
    public function updatePassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => ['required', 'confirmed', Password::defaults()],
        ]);

        $request->user()->update([
            'password' => Hash::make($validated['password']),
        ]);

        return response()->json([
            'message' => __('Password updated'),
        ]);
    }
}
