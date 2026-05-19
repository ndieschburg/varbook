<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Book;
use App\Models\ReadingSession;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class StatsController extends Controller
{
    /**
     * GET /api/admin/stats
     * Get global statistics
     */
    public function index(): JsonResponse
    {
        $totalUsers = User::count();
        $totalBooks = Book::count();
        $totalReadingSeconds = Book::sum('total_reading_seconds');
        $totalSessions = ReadingSession::count();
        $booksFinished = Book::where('is_finished', true)->count();
        $booksReading = Book::where('progress', '>', 0)->where('is_finished', false)->count();

        return response()->json([
            'data' => [
                'total_users' => $totalUsers,
                'total_books' => $totalBooks,
                'total_reading_time' => $this->formatDuration($totalReadingSeconds),
                'total_reading_seconds' => $totalReadingSeconds,
                'total_sessions' => $totalSessions,
                'books_finished' => $booksFinished,
                'books_reading' => $booksReading,
            ],
        ]);
    }

    /**
     * GET /api/admin/stats/activity
     * Get user activity stats: active users this month, total hours, per-user per-client breakdown
     */
    public function activity(): JsonResponse
    {
        $startOfMonth = Carbon::now()->startOfMonth();
        $endOfMonth = Carbon::now()->endOfMonth();

        // Per-user, per-client reading time this month
        $userClientStats = DB::table('reading_sessions')
            ->join('books', 'reading_sessions.book_id', '=', 'books.id')
            ->join('users', 'books.user_id', '=', 'users.id')
            ->whereBetween('reading_sessions.started_at', [$startOfMonth, $endOfMonth])
            ->select(
                'users.id as user_id',
                'users.name as user_name',
                'reading_sessions.client',
                DB::raw('SUM(reading_sessions.duration_seconds) as total_seconds')
            )
            ->groupBy('users.id', 'users.name', 'reading_sessions.client')
            ->orderBy('total_seconds', 'desc')
            ->get();

        // Build per-user aggregation
        $usersMap = [];
        $allClients = [];

        foreach ($userClientStats as $row) {
            $clientLabel = $this->getClientLabel($row->client);
            $allClients[$row->client] = $clientLabel;

            if (! isset($usersMap[$row->user_id])) {
                $usersMap[$row->user_id] = [
                    'user_id' => $row->user_id,
                    'user_name' => $row->user_name,
                    'total_seconds' => 0,
                    'clients' => [],
                ];
            }

            $usersMap[$row->user_id]['total_seconds'] += $row->total_seconds;
            $usersMap[$row->user_id]['clients'][$row->client] = [
                'hours' => round($row->total_seconds / 3600, 1),
                'label' => $clientLabel,
            ];
        }

        // Sort by total hours descending, filter out 0h users
        $users = collect($usersMap)
            ->filter(fn ($u) => $u['total_seconds'] > 0)
            ->sortByDesc('total_seconds')
            ->values()
            ->map(fn ($u) => [
                'user_id' => $u['user_id'],
                'user_name' => $u['user_name'],
                'total_hours' => round($u['total_seconds'] / 3600, 1),
                'total_formatted' => $this->formatDuration($u['total_seconds']),
                'clients' => $u['clients'],
            ])
            ->all();

        $activeUsersCount = count($users);
        $totalMonthSeconds = (int) collect($usersMap)->sum('total_seconds');

        // Daily total book count (cumulative) for the current month
        $booksBeforeMonth = Book::where('created_at', '<', $startOfMonth)->count();

        $booksAddedPerDay = Book::whereBetween('created_at', [$startOfMonth, $endOfMonth])
            ->select(DB::raw('DATE(created_at) as day'), DB::raw('COUNT(*) as count'))
            ->groupBy('day')
            ->orderBy('day')
            ->pluck('count', 'day');

        $today = Carbon::now();
        $daysInRange = $startOfMonth->daysUntil($today->copy()->addDay());
        $booksByDay = [];
        $cumulative = $booksBeforeMonth;

        foreach ($daysInRange as $day) {
            $dayStr = $day->format('Y-m-d');
            $cumulative += $booksAddedPerDay[$dayStr] ?? 0;
            $booksByDay[] = [
                'date' => $dayStr,
                'total' => $cumulative,
            ];
        }

        return response()->json([
            'data' => [
                'active_users_this_month' => $activeUsersCount,
                'total_hours_this_month' => round($totalMonthSeconds / 3600, 1),
                'total_formatted_this_month' => $this->formatDuration($totalMonthSeconds),
                'clients' => array_values(array_map(
                    fn ($key, $label) => ['key' => $key, 'label' => $label],
                    array_keys($allClients),
                    array_values($allClients)
                )),
                'users' => $users,
                'books_by_day' => $booksByDay,
            ],
        ]);
    }

    /**
     * Get human-readable label for a client identifier
     */
    protected function getClientLabel(string $client): string
    {
        return match ($client) {
            'moon' => 'Moon+ Reader',
            'koreader' => 'KOReader',
            'web' => 'Web',
            default => ucfirst($client),
        };
    }

    protected function formatDuration(int $seconds): string
    {
        $hours = floor($seconds / 3600);
        $minutes = floor(($seconds % 3600) / 60);

        if ($hours > 0) {
            return "{$hours}h {$minutes}m";
        }

        return "{$minutes}m";
    }
}
