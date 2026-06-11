<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Book;
use App\Models\ReadingSession;
use App\Models\User;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
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
        // Book counts reflect active library only
        $totalBooks = Book::count();
        // Reading time includes deleted books to preserve history
        $totalReadingSeconds = Book::withTrashed()->sum('total_reading_seconds');
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
     * Get user activity stats with optional date range filtering
     *
     * @param Request $request Query params: start_date (Y-m-d), end_date (Y-m-d)
     */
    public function activity(Request $request): JsonResponse
    {
        $request->validate([
            'start_date' => 'nullable|date_format:Y-m-d',
            'end_date' => 'nullable|date_format:Y-m-d',
        ]);

        // Determine the earliest data point to compute default start
        $earliestDate = $this->getEarliestDate();

        $startDate = $request->query('start_date')
            ? Carbon::parse($request->query('start_date'))->startOfDay()
            : ($earliestDate ?? Carbon::now()->startOfMonth());

        $endDate = $request->query('end_date')
            ? Carbon::parse($request->query('end_date'))->endOfDay()
            : Carbon::now()->endOfDay();

        // Per-user, per-client reading time in range
        $userClientStats = DB::table('reading_sessions')
            ->join('books', 'reading_sessions.book_id', '=', 'books.id')
            ->join('users', 'books.user_id', '=', 'users.id')
            ->whereBetween('reading_sessions.started_at', [$startDate, $endDate])
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
        $totalRangeSeconds = (int) collect($usersMap)->sum('total_seconds');

        $endOfRange = min($endDate->copy(), Carbon::now());

        // Books cumulative day by day (active library only)
        $booksByDay = $this->buildCumulativeSeries(
            table: 'books',
            dateColumn: 'created_at',
            startDate: $startDate,
            endDate: $endOfRange,
            excludeSoftDeleted: true,
        );

        // Verified users cumulative day by day
        $verifiedByDay = $this->buildCumulativeSeries(
            table: 'users',
            dateColumn: 'email_verified_at',
            startDate: $startDate,
            endDate: $endOfRange,
            whereNotNull: 'email_verified_at',
        );

        // Reading hours cumulative day by day
        $readingHoursByDay = $this->buildDailyHoursSeries($startDate, $endOfRange);

        $lastBookEntry = end($booksByDay);

        // Top 5 readers (last 12 months) with monthly breakdown
        $twelveMonthsAgo = Carbon::now()->subMonths(12);

        $topUserIds = User::query()
            ->select('users.id')
            ->join('books', 'books.user_id', '=', 'users.id')
            ->join('reading_sessions', 'reading_sessions.book_id', '=', 'books.id')
            ->where('reading_sessions.started_at', '>=', $twelveMonthsAgo)
            ->groupBy('users.id')
            ->orderByDesc(DB::raw('SUM(reading_sessions.duration_seconds)'))
            ->limit(5)
            ->pluck('users.id');

        $monthFormat = DB::getDriverName() === 'sqlite'
            ? "strftime('%Y-%m', reading_sessions.started_at)"
            : "DATE_FORMAT(reading_sessions.started_at, '%Y-%m')";

        $monthlyData = DB::table('reading_sessions')
            ->join('books', 'books.id', '=', 'reading_sessions.book_id')
            ->join('users', 'users.id', '=', 'books.user_id')
            ->select(
                'users.id as user_id',
                'users.name',
                DB::raw("{$monthFormat} as month"),
                DB::raw('SUM(reading_sessions.duration_seconds) as total_seconds')
            )
            ->whereIn('users.id', $topUserIds)
            ->where('reading_sessions.started_at', '>=', $twelveMonthsAgo)
            ->groupBy('users.id', 'users.name', 'month')
            ->get();

        $months = collect();
        for ($i = 11; $i >= 0; $i--) {
            $months->push(Carbon::now()->subMonths($i)->format('Y-m'));
        }

        $readersByUser = [];
        foreach ($monthlyData as $row) {
            if (! isset($readersByUser[$row->user_id])) {
                $readersByUser[$row->user_id] = [
                    'name' => $row->name,
                    'total_seconds' => 0,
                    'monthly' => [],
                ];
            }
            $hours = round($row->total_seconds / 3600, 1);
            $readersByUser[$row->user_id]['monthly'][$row->month] = $hours;
            $readersByUser[$row->user_id]['total_seconds'] += $row->total_seconds;
        }

        $topReaders = collect($readersByUser)
            ->sortByDesc('total_seconds')
            ->values()
            ->map(function ($reader) use ($months) {
                $monthlyHours = [];
                foreach ($months as $month) {
                    $monthlyHours[] = $reader['monthly'][$month] ?? 0;
                }
                return [
                    'name' => $reader['name'],
                    'total_hours' => round($reader['total_seconds'] / 3600, 1),
                    'monthly_hours' => $monthlyHours,
                ];
            });

        $topReadersData = [
            'months' => $months->values()->all(),
            'readers' => $topReaders->all(),
        ];

        return response()->json([
            'data' => [
                'total_books' => $lastBookEntry ? $lastBookEntry['total'] : 0,
                'active_users_count' => $activeUsersCount,
                'total_hours' => round($totalRangeSeconds / 3600, 1),
                'total_formatted' => $this->formatDuration($totalRangeSeconds),
                'start_date' => $startDate->format('Y-m-d'),
                'end_date' => $endDate->format('Y-m-d'),
                'earliest_date' => $earliestDate?->format('Y-m-d'),
                'clients' => array_values(array_map(
                    fn ($key, $label) => ['key' => $key, 'label' => $label],
                    array_keys($allClients),
                    array_values($allClients)
                )),
                'users' => $users,
                'books_by_day' => $booksByDay,
                'verified_users_by_day' => $verifiedByDay,
                'reading_hours_by_day' => $readingHoursByDay,
                'top_readers' => $topReadersData,
            ],
        ]);
    }

    /**
     * Build a cumulative count series for a given table/column over a date range
     */
    protected function buildCumulativeSeries(
        string $table,
        string $dateColumn,
        Carbon $startDate,
        Carbon $endDate,
        ?string $whereNotNull = null,
        bool $excludeSoftDeleted = false,
    ): array {
        $query = DB::table($table)->where($dateColumn, '<', $startDate);
        if ($whereNotNull) {
            $query->whereNotNull($whereNotNull);
        }
        if ($excludeSoftDeleted) {
            $query->whereNull('deleted_at');
        }
        $countBefore = $query->count();

        $perDayQuery = DB::table($table)
            ->whereBetween($dateColumn, [$startDate, $endDate])
            ->select(DB::raw("DATE({$dateColumn}) as day"), DB::raw('COUNT(*) as count'))
            ->groupBy('day')
            ->orderBy('day');
        if ($whereNotNull) {
            $perDayQuery->whereNotNull($whereNotNull);
        }
        if ($excludeSoftDeleted) {
            $perDayQuery->whereNull('deleted_at');
        }
        $perDay = $perDayQuery->pluck('count', 'day');

        return $this->expandCumulative($startDate, $endDate, $countBefore, $perDay);
    }

    /**
     * Build a cumulative reading hours series over a date range
     */
    protected function buildDailyHoursSeries(Carbon $startDate, Carbon $endDate): array
    {
        $perDay = ReadingSession::whereBetween('started_at', [$startDate, $endDate])
            ->select(DB::raw('DATE(started_at) as day'), DB::raw('SUM(duration_seconds) as total_seconds'))
            ->groupBy('day')
            ->orderBy('day')
            ->pluck('total_seconds', 'day');

        $result = [];
        $period = CarbonPeriod::create($startDate->copy()->startOfDay(), $endDate->copy()->startOfDay());

        foreach ($period as $day) {
            $dayStr = $day->format('Y-m-d');
            $result[] = [
                'date' => $dayStr,
                'total' => round((int) ($perDay[$dayStr] ?? 0) / 3600, 1),
            ];
        }

        return $result;
    }

    /**
     * Expand daily counts into a cumulative series filling every day in range
     */
    protected function expandCumulative(Carbon $startDate, Carbon $endDate, int $initialCount, Collection $perDay): array
    {
        $result = [];
        $cumulative = $initialCount;
        $period = CarbonPeriod::create($startDate->copy()->startOfDay(), $endDate->copy()->startOfDay());

        foreach ($period as $day) {
            $dayStr = $day->format('Y-m-d');
            $cumulative += $perDay[$dayStr] ?? 0;
            $result[] = [
                'date' => $dayStr,
                'total' => $cumulative,
            ];
        }

        return $result;
    }

    /**
     * GET /api/admin/stats/books-reading
     * Get paginated list of books with reading activity (owner, reading time, first/last read)
     *
     * @param Request $request Query params: page (int), per_page (int, default 20)
     */
    public function booksReading(Request $request): JsonResponse
    {
        $request->validate([
            'page' => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        $perPage = (int) $request->query('per_page', 20);

        $books = Book::withTrashed()
            ->join('users', 'users.id', '=', 'books.user_id')
            ->leftJoin('reading_sessions', 'reading_sessions.book_id', '=', 'books.id')
            ->select(
                'books.id',
                'books.title',
                'books.author',
                'users.name as owner',
                'books.total_reading_seconds',
                DB::raw('MIN(reading_sessions.started_at) as first_read_at'),
                DB::raw('MAX(COALESCE(reading_sessions.ended_at, reading_sessions.started_at)) as last_read_at'),
            )
            ->groupBy('books.id', 'books.title', 'books.author', 'users.name', 'books.total_reading_seconds')
            ->orderByRaw('last_read_at IS NULL, last_read_at DESC')
            ->paginate($perPage);

        $items = $books->getCollection()->map(fn ($book) => [
            'id' => $book->id,
            'title' => $book->title,
            'author' => $book->author,
            'owner' => $book->owner,
            'total_reading_seconds' => $book->total_reading_seconds,
            'total_formatted' => $this->formatDuration($book->total_reading_seconds),
            'first_read_at' => $book->first_read_at,
            'last_read_at' => $book->last_read_at,
        ]);

        return response()->json([
            'data' => $items,
            'meta' => [
                'current_page' => $books->currentPage(),
                'last_page' => $books->lastPage(),
                'per_page' => $books->perPage(),
                'total' => $books->total(),
            ],
        ]);
    }

    /**
     * Find the earliest date across books, users, and reading sessions
     */
    protected function getEarliestDate(): ?Carbon
    {
        $dates = array_filter([
            Book::withTrashed()->min('created_at'),
            User::min('created_at'),
            ReadingSession::min('started_at'),
        ]);

        if (empty($dates)) {
            return null;
        }

        return Carbon::parse(min($dates))->startOfDay();
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
