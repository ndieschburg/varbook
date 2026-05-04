<?php

namespace App\Http\Middleware;

use App\Models\ApiToken;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class VarbookAuthMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $plainToken = $request->bearerToken();

        if (! $plainToken) {
            return $this->unauthorized();
        }

        $apiToken = ApiToken::findByPlainToken($plainToken);

        if (! $apiToken) {
            return $this->unauthorized();
        }

        Auth::login($apiToken->user);
        $apiToken->markAsUsed();

        return $next($request);
    }

    protected function unauthorized(): Response
    {
        return response()->json([
            'message' => __('Unauthorized'),
        ], 401);
    }
}
