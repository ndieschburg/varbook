<?php

namespace App\Services;

use App\Facades\Settings;
use App\Models\ProgressLog;
use Illuminate\Http\Request;

class ProgressLoggingService
{
    public static function isEnabled(): bool
    {
        return (bool) Settings::get('general.progress_logging');
    }

    public static function log(
        Request $request,
        string $action,
        ?int $bookId = null,
        ?string $client = null,
        array $requestData = [],
        array $responseData = [],
        bool $success = true,
        ?string $errorMessage = null
    ): void {
        if (!self::isEnabled()) {
            return;
        }

        $user = $request->user();
        if (!$user) {
            return;
        }

        ProgressLog::create([
            'user_id' => $user->id,
            'book_id' => $bookId,
            'action' => $action,
            'client' => $client,
            'request_data' => $requestData,
            'response_data' => $responseData,
            'ip_address' => $request->ip(),
            'user_agent' => substr($request->userAgent() ?? '', 0, 500),
            'success' => $success,
            'error_message' => $errorMessage,
        ]);
    }

    public static function truncateOldLogs(int $daysToKeep = 7): int
    {
        return ProgressLog::where('created_at', '<', now()->subDays($daysToKeep))->delete();
    }
}
