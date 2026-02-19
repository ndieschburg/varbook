<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Symfony\Component\HttpFoundation\Response;

class SetLocale
{
    /**
     * Supported locales.
     */
    protected array $supportedLocales = ['en', 'fr'];

    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $locale = $this->determineLocale($request);
        App::setLocale($locale);

        return $next($request);
    }

    /**
     * Determine the locale to use.
     */
    protected function determineLocale(Request $request): string
    {
        // 1. Check session preference
        if ($locale = session('locale')) {
            if (in_array($locale, $this->supportedLocales)) {
                return $locale;
            }
        }

        // 2. Detect from browser Accept-Language header
        $browserLocale = $this->detectBrowserLocale($request);
        if ($browserLocale) {
            return $browserLocale;
        }

        // 3. Fall back to default (English)
        return 'en';
    }

    /**
     * Detect locale from browser Accept-Language header.
     */
    protected function detectBrowserLocale(Request $request): ?string
    {
        $acceptLanguage = $request->header('Accept-Language');

        if (!$acceptLanguage) {
            return null;
        }

        // Parse Accept-Language header
        $languages = [];
        foreach (explode(',', $acceptLanguage) as $part) {
            $part = trim($part);
            $quality = 1.0;

            if (str_contains($part, ';q=')) {
                [$part, $q] = explode(';q=', $part);
                $quality = (float) $q;
            }

            // Get the primary language code (e.g., "fr" from "fr-FR")
            $lang = strtolower(substr(trim($part), 0, 2));
            $languages[$lang] = $quality;
        }

        // Sort by quality
        arsort($languages);

        // Find first supported locale
        foreach (array_keys($languages) as $lang) {
            if (in_array($lang, $this->supportedLocales)) {
                return $lang;
            }
        }

        return null;
    }
}
