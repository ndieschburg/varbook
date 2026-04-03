<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;

class DebugLogController extends Controller
{
    private const CACHE_KEY = 'debug_logs';
    private const MAX_LOGS = 1000;
    private const TTL_HOURS = 1;
    private const LOG_FILE = 'logs/frontend-debug.log';

    /**
     * POST /api/debug/logs
     * Receive logs from the frontend
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'logs' => 'required|array',
            'logs.*' => 'string',
        ]);

        $logs = Cache::get(self::CACHE_KEY, []);
        $newLogs = $validated['logs'];

        // Add timestamp and user info
        $userId = auth()->id() ?? 'anonymous';
        $timestampedLogs = array_map(
            fn($log) => "[User:{$userId}] {$log}",
            $newLogs
        );

        $logs = array_merge($logs, $timestampedLogs);

        // Keep only last N logs in cache
        if (count($logs) > self::MAX_LOGS) {
            $logs = array_slice($logs, -self::MAX_LOGS);
        }

        Cache::put(self::CACHE_KEY, $logs, now()->addHours(self::TTL_HOURS));

        // Also append to file for persistence
        $logLines = implode("\n", $timestampedLogs) . "\n";
        Storage::append(self::LOG_FILE, $logLines);

        return response()->json(['stored' => count($newLogs)]);
    }

    /**
     * GET /api/debug/logs
     * Read logs (for viewing on PC)
     */
    public function index(Request $request): JsonResponse
    {
        $logs = Cache::get(self::CACHE_KEY, []);

        // Optional: filter by user
        if ($userId = $request->query('user')) {
            $logs = array_filter($logs, fn($log) => str_contains($log, "[User:{$userId}]"));
        }

        // Optional: filter by keyword
        if ($keyword = $request->query('q')) {
            $logs = array_filter($logs, fn($log) => stripos($log, $keyword) !== false);
        }

        return response()->json([
            'count' => count($logs),
            'logs' => array_values($logs),
        ]);
    }

    /**
     * DELETE /api/debug/logs
     * Clear logs (cache only, file is preserved)
     */
    public function destroy(Request $request): JsonResponse
    {
        Cache::forget(self::CACHE_KEY);

        // Optionally clear the file too
        if ($request->query('file') === '1') {
            Storage::delete(self::LOG_FILE);
        }

        return response()->json(['message' => 'Logs cleared']);
    }

    /**
     * GET /api/debug/logs/stream
     * Server-Sent Events stream for real-time logs
     */
    public function stream(Request $request)
    {
        return response()->stream(function () {
            $lastCount = 0;

            while (true) {
                $logs = Cache::get(self::CACHE_KEY, []);
                $currentCount = count($logs);

                if ($currentCount > $lastCount) {
                    $newLogs = array_slice($logs, $lastCount);
                    echo "data: " . json_encode($newLogs) . "\n\n";
                    ob_flush();
                    flush();
                    $lastCount = $currentCount;
                }

                sleep(1);

                if (connection_aborted()) {
                    break;
                }
            }
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'Connection' => 'keep-alive',
            'X-Accel-Buffering' => 'no',
        ]);
    }
}
