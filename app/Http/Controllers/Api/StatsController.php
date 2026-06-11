<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Book;
use App\Models\ReadingSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StatsController extends Controller
{
    /**
     * GET /api/stats
     * Get user reading statistics
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        // Basic stats (include soft-deleted books to preserve history)
        $totalBooks = Book::withTrashed()->where('user_id', $user->id)->count();
        $booksFinished = Book::withTrashed()->where('user_id', $user->id)->where('is_finished', true)->count();
        $booksReading = Book::withTrashed()->where('user_id', $user->id)
            ->where('progress', '>', 0)
            ->where('is_finished', false)
            ->count();
        $booksNotStarted = $totalBooks - $booksFinished - $booksReading;

        // Reading time
        $totalReadingSeconds = Book::withTrashed()->where('user_id', $user->id)->sum('total_reading_seconds');

        // Sessions
        $totalSessions = ReadingSession::whereHas('book', function ($query) use ($user) {
            $query->withTrashed()->where('user_id', $user->id);
        })->count();

        // Reading by month (last 12 months)
        $readingByMonth = ReadingSession::whereHas('book', function ($query) use ($user) {
            $query->withTrashed()->where('user_id', $user->id);
        })
            ->where('started_at', '>=', now()->subMonths(12))
            ->select(
                DB::raw($this->dateFormatMonth('started_at').' as month'),
                DB::raw('SUM(duration_seconds) as total_seconds'),
                DB::raw('COUNT(*) as sessions')
            )
            ->groupBy('month')
            ->orderBy('month')
            ->get()
            ->map(fn ($row) => [
                'month' => $row->month,
                'hours' => round($row->total_seconds / 3600, 1),
                'sessions' => $row->sessions,
            ]);

        // Reading by client
        $readingByClient = ReadingSession::whereHas('book', function ($query) use ($user) {
            $query->withTrashed()->where('user_id', $user->id);
        })
            ->select(
                'client',
                DB::raw('SUM(duration_seconds) as total_seconds'),
                DB::raw('COUNT(*) as sessions')
            )
            ->groupBy('client')
            ->get()
            ->map(fn ($row) => [
                'client' => $row->client,
                'label' => $this->getClientLabel($row->client),
                'hours' => round($row->total_seconds / 3600, 1),
                'sessions' => $row->sessions,
            ]);

        // Cumulative reading hours by day per client (from first session to now)
        $firstSession = ReadingSession::whereHas('book', function ($query) use ($user) {
            $query->withTrashed()->where('user_id', $user->id);
        })->orderBy('started_at')->first();

        $readingHoursByDay = ['clients' => [], 'days' => []];
        if ($firstSession) {
            $startDate = $firstSession->started_at->copy()->startOfDay();
            $endDate = now()->startOfDay();

            // Total per day (all clients)
            $totalPerDay = ReadingSession::whereHas('book', function ($query) use ($user) {
                $query->withTrashed()->where('user_id', $user->id);
            })
                ->select(DB::raw('DATE(started_at) as day'), DB::raw('SUM(duration_seconds) as total_seconds'))
                ->groupBy('day')
                ->orderBy('day')
                ->pluck('total_seconds', 'day');

            // Per client per day
            $clientPerDay = ReadingSession::whereHas('book', function ($query) use ($user) {
                $query->withTrashed()->where('user_id', $user->id);
            })
                ->select('client', DB::raw('DATE(started_at) as day'), DB::raw('SUM(duration_seconds) as total_seconds'))
                ->groupBy('client', 'day')
                ->orderBy('day')
                ->get();

            // Group by client
            $clientDayMap = [];
            $clientKeys = [];
            foreach ($clientPerDay as $row) {
                $clientDayMap[$row->client][$row->day] = (int) $row->total_seconds;
                $clientKeys[$row->client] = $this->getClientLabel($row->client);
            }

            // Build daily series with cumulative totals
            $period = \Carbon\CarbonPeriod::create($startDate, $endDate);
            $cumulativeTotal = 0;
            $cumulativeClients = array_fill_keys(array_keys($clientKeys), 0);
            $dayEntries = [];

            foreach ($period as $day) {
                $dayStr = $day->format('Y-m-d');
                $daySeconds = (int) ($totalPerDay[$dayStr] ?? 0);
                $cumulativeTotal += $daySeconds;

                $clientValues = [];
                foreach ($clientKeys as $clientKey => $clientLabel) {
                    $cumulativeClients[$clientKey] += $clientDayMap[$clientKey][$dayStr] ?? 0;
                    $clientValues[$clientKey] = round($cumulativeClients[$clientKey] / 3600, 1);
                }

                $dayEntries[] = [
                    'date' => $dayStr,
                    'total' => round($cumulativeTotal / 3600, 1),
                    'day_hours' => round($daySeconds / 3600, 1),
                    'clients' => $clientValues,
                ];
            }

            $readingHoursByDay = [
                'clients' => array_values(array_map(
                    fn ($key, $label) => ['key' => $key, 'label' => $label],
                    array_keys($clientKeys),
                    array_values($clientKeys)
                )),
                'days' => $dayEntries,
            ];
        }

        // Recent sessions
        $recentSessions = ReadingSession::with(['book' => function ($query) {
                $query->withTrashed()->select('id', 'title', 'author', 'cover_path');
            }])
            ->whereHas('book', function ($query) use ($user) {
                $query->withTrashed()->where('user_id', $user->id);
            })
            ->orderBy('started_at', 'desc')
            ->limit(1000)
            ->get()
            ->map(fn ($session) => [
                'id' => $session->id,
                'book' => [
                    'id' => $session->book->id,
                    'title' => $session->book->title,
                    'author' => $session->book->author,
                    'cover_url' => $session->book->cover_url,
                ],
                'started_at' => $session->started_at?->toIso8601String(),
                'duration_seconds' => $session->duration_seconds,
                'formatted_duration' => $session->formatted_duration,
                'client' => $session->client,
            ]);

        // Monthly rank: rank the current user among all users by reading time this month
        $startOfMonth = now()->startOfMonth();
        $endOfMonth = now()->endOfMonth();

        $monthlyRanking = DB::table('reading_sessions')
            ->join('books', 'reading_sessions.book_id', '=', 'books.id')
            ->whereBetween('reading_sessions.started_at', [$startOfMonth, $endOfMonth])
            ->select('books.user_id', DB::raw('SUM(reading_sessions.duration_seconds) as total_seconds'))
            ->groupBy('books.user_id')
            ->orderByDesc('total_seconds')
            ->get();

        $monthlyRank = null;
        $monthlyRankTotal = $monthlyRanking->count();
        $monthlyRankHours = 0;

        foreach ($monthlyRanking->values() as $index => $row) {
            if ((int) $row->user_id === $user->id) {
                $monthlyRank = $index + 1;
                $monthlyRankHours = round($row->total_seconds / 3600, 1);
                break;
            }
        }

        return response()->json([
            'data' => [
                'total_books' => $totalBooks,
                'books_finished' => $booksFinished,
                'books_reading' => $booksReading,
                'books_not_started' => $booksNotStarted,
                'total_reading_seconds' => $totalReadingSeconds,
                'total_reading_time' => $this->formatDuration($totalReadingSeconds),
                'total_sessions' => $totalSessions,
                'monthly_rank' => $monthlyRank,
                'monthly_rank_total' => $monthlyRankTotal,
                'monthly_rank_hours' => $monthlyRankHours,
                'reading_by_month' => $readingByMonth,
                'reading_by_client' => $readingByClient,
                'reading_hours_by_day' => $readingHoursByDay,
                'recent_sessions' => $recentSessions,
            ],
        ]);
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

    protected function getClientLabel(string $client): string
    {
        return match ($client) {
            'moon' => 'Moon+ Reader',
            'koreader' => 'KOReader',
            'web' => 'Web',
            default => ucfirst($client),
        };
    }

    /**
     * Return a DB-agnostic expression to format a date column as 'YYYY-MM'.
     */
    protected function dateFormatMonth(string $column): string
    {
        $driver = DB::getDriverName();

        return match ($driver) {
            'sqlite' => "strftime('%Y-%m', $column)",
            default => "DATE_FORMAT($column, '%Y-%m')",
        };
    }
}
