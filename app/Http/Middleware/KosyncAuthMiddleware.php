<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Symfony\Component\HttpFoundation\Response;

class KosyncAuthMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $username = $request->header('x-auth-user');
        $authKey = $request->header('x-auth-key');

        if (!$username || !$authKey) {
            return $this->unauthorized();
        }

        $user = User::where('email', $username)->first();

        if (!$user || !$user->kosync_password_hash || !Hash::check($authKey, $user->kosync_password_hash)) {
            return $this->unauthorized();
        }

        Auth::login($user);

        return $next($request);
    }

    protected function unauthorized(): Response
    {
        return response()->json([
            'message' => __('Unauthorized'),
        ], 401);
    }
}
