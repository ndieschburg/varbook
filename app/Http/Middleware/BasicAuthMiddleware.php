<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Symfony\Component\HttpFoundation\Response;

class BasicAuthMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $email = $request->getUser();
        $password = $request->getPassword();

        if (!$email || !$password) {
            return $this->unauthorized();
        }

        $user = User::where('email', $email)->first();

        if (!$user || !Hash::check($password, $user->password)) {
            return $this->unauthorized();
        }

        Auth::login($user);

        return $next($request);
    }

    protected function unauthorized(): Response
    {
        return response('Unauthorized', 401)
            ->header('WWW-Authenticate', 'Basic realm="Varbook"');
    }
}
