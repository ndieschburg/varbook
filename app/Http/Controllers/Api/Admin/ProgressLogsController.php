<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ProgressLog;
use App\Services\ProgressLoggingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProgressLogsController extends Controller
{
    /**
     * GET /api/admin/progress-logs
     * List progress logs with pagination and filters
     */
    public function index(Request $request): JsonResponse
    {
        $query = ProgressLog::with(['user:id,name,email', 'book:id,title'])
            ->orderBy('created_at', 'desc');

        // Filter by user
        if ($request->has('user_id')) {
            $query->where('user_id', $request->input('user_id'));
        }

        // Filter by book
        if ($request->has('book_id')) {
            $query->where('book_id', $request->input('book_id'));
        }

        // Filter by action
        if ($request->has('action')) {
            $query->where('action', $request->input('action'));
        }

        // Filter by client
        if ($request->has('client')) {
            $query->where('client', $request->input('client'));
        }

        // Filter by success/failure
        if ($request->has('success')) {
            $query->where('success', $request->boolean('success'));
        }

        $perPage = min($request->input('per_page', 50), 100);
        $logs = $query->paginate($perPage);

        return response()->json([
            'data' => $logs->items(),
            'meta' => [
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
                'per_page' => $logs->perPage(),
                'total' => $logs->total(),
            ],
        ]);
    }

    /**
     * GET /api/admin/progress-logs/{id}
     * Get a single log entry with full details
     */
    public function show(ProgressLog $progressLog): JsonResponse
    {
        $progressLog->load(['user:id,name,email', 'book:id,title,author']);

        return response()->json([
            'data' => $progressLog,
        ]);
    }

    /**
     * DELETE /api/admin/progress-logs
     * Clear old logs
     */
    public function destroy(Request $request): JsonResponse
    {
        $daysToKeep = $request->input('days_to_keep', 7);
        $deleted = ProgressLoggingService::truncateOldLogs($daysToKeep);

        return response()->json([
            'message' => __('Deleted :count old log entries', ['count' => $deleted]),
            'deleted_count' => $deleted,
        ]);
    }

    /**
     * GET /api/admin/progress-logs/stats
     * Get logging statistics
     */
    public function stats(): JsonResponse
    {
        $totalLogs = ProgressLog::count();
        $logsToday = ProgressLog::whereDate('created_at', today())->count();
        $failedLogs = ProgressLog::where('success', false)->count();

        $byAction = ProgressLog::selectRaw('action, count(*) as count')
            ->groupBy('action')
            ->pluck('count', 'action');

        $byClient = ProgressLog::selectRaw('client, count(*) as count')
            ->whereNotNull('client')
            ->groupBy('client')
            ->pluck('count', 'client');

        return response()->json([
            'data' => [
                'total_logs' => $totalLogs,
                'logs_today' => $logsToday,
                'failed_logs' => $failedLogs,
                'by_action' => $byAction,
                'by_client' => $byClient,
                'logging_enabled' => ProgressLoggingService::isEnabled(),
            ],
        ]);
    }
}
