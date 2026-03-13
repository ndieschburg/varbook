<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class VerifyEmailController extends Controller
{
    /**
     * Mark the user's email address as verified.
     * Supports both authenticated and unauthenticated users.
     */
    public function __invoke(Request $request, $id, $hash): RedirectResponse
    {
        // Verify the signature to ensure the URL hasn't been tampered with
        if (!$request->hasValidSignature()) {
            abort(403, 'Invalid or expired verification link.');
        }

        // Find the user by ID
        $user = User::findOrFail($id);

        // Verify the hash matches the user's email
        if (!hash_equals($hash, sha1($user->email))) {
            abort(403, 'Invalid verification link.');
        }

        // If email is already verified
        if ($user->hasVerifiedEmail()) {
            // If user is not authenticated, log them in
            if (!Auth::check()) {
                Auth::login($user);
                if ($request->hasSession()) {
                    $request->session()->regenerate();
                }
            }
            return redirect('/library?verified=1&already=1');
        }

        // Mark email as verified
        if ($user->markEmailAsVerified()) {
            event(new Verified($user));
        }

        // Automatically log in the user if not already authenticated
        if (!Auth::check()) {
            Auth::login($user);
            if ($request->hasSession()) {
                $request->session()->regenerate();
            }
        }

        return redirect('/library?verified=1');
    }
}
