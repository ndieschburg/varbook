<?php

namespace App\Livewire;

use App\Models\Book;
use App\Models\ReadingSession;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Livewire\Component;

class ReadingDashboard extends Component
{
    public string $period = 'year';

    public function setPeriod(string $period): void
    {
        $this->period = $period;
    }

    protected function getDateRange(): array
    {
        return match ($this->period) {
            'week' => [now()->subWeek(), now()],
            'month' => [now()->subMonth(), now()],
            'year' => [now()->subYear(), now()],
            'all' => [now()->subYears(10), now()],
            default => [now()->subYear(), now()],
        };
    }

    /**
     * Get summary statistics
     */
    protected function getStats(): array
    {
        $userId = Auth::id();
        [$startDate, $endDate] = $this->getDateRange();

        // Total reading time in period
        $totalSeconds = ReadingSession::whereHas('book', fn ($q) => $q->where('user_id', $userId))
            ->whereBetween('started_at', [$startDate, $endDate])
            ->sum('duration_seconds');

        // Books finished in period
        $booksFinished = Book::where('user_id', $userId)
            ->where('is_finished', true)
            ->whereBetween('updated_at', [$startDate, $endDate])
            ->count();

        // Currently reading
        $currentlyReading = Book::where('user_id', $userId)
            ->where('progress', '>', 0)
            ->where('is_finished', false)
            ->count();

        // Total books
        $totalBooks = Book::where('user_id', $userId)->count();

        // Reading streak (consecutive days)
        $streak = $this->calculateStreak($userId);

        // Sessions count
        $sessionsCount = ReadingSession::whereHas('book', fn ($q) => $q->where('user_id', $userId))
            ->whereBetween('started_at', [$startDate, $endDate])
            ->count();

        // Average session duration
        $avgSession = $sessionsCount > 0 ? $totalSeconds / $sessionsCount : 0;

        // Pages read estimate (assuming ~2 minutes per page)
        $pagesEstimate = round($totalSeconds / 120);

        return [
            'totalTime' => $this->formatDuration($totalSeconds),
            'totalSeconds' => $totalSeconds,
            'booksFinished' => $booksFinished,
            'currentlyReading' => $currentlyReading,
            'totalBooks' => $totalBooks,
            'streak' => $streak,
            'sessionsCount' => $sessionsCount,
            'avgSession' => $this->formatDuration($avgSession),
            'pagesEstimate' => $pagesEstimate,
        ];
    }

    /**
     * Calculate reading streak (consecutive days)
     */
    protected function calculateStreak(int $userId): int
    {
        $dates = ReadingSession::whereHas('book', fn ($q) => $q->where('user_id', $userId))
            ->select(DB::raw('DATE(started_at) as date'))
            ->groupBy('date')
            ->orderBy('date', 'desc')
            ->pluck('date')
            ->map(fn ($d) => Carbon::parse($d)->format('Y-m-d'))
            ->toArray();

        if (empty($dates)) {
            return 0;
        }

        $streak = 0;
        $checkDate = now()->format('Y-m-d');

        // If no reading today, check if yesterday was the last day
        if ($dates[0] !== $checkDate) {
            $checkDate = now()->subDay()->format('Y-m-d');
            if ($dates[0] !== $checkDate) {
                return 0; // Streak broken
            }
        }

        foreach ($dates as $date) {
            if ($date === $checkDate) {
                $streak++;
                $checkDate = Carbon::parse($checkDate)->subDay()->format('Y-m-d');
            } else {
                break;
            }
        }

        return $streak;
    }

    /**
     * Get activity data for heatmap (GitHub style)
     */
    protected function getActivityHeatmap(): array
    {
        $userId = Auth::id();
        $startDate = now()->subMonths(6)->startOfWeek();
        $endDate = now()->endOfDay();

        // Get reading time per day
        $dailyReading = ReadingSession::whereHas('book', fn ($q) => $q->where('user_id', $userId))
            ->whereBetween('started_at', [$startDate, $endDate])
            ->select(
                DB::raw('DATE(started_at) as date'),
                DB::raw('SUM(duration_seconds) as total_seconds')
            )
            ->groupBy('date')
            ->pluck('total_seconds', 'date')
            ->toArray();

        // Build weeks array for heatmap
        $weeks = [];
        $currentWeek = [];
        $period = CarbonPeriod::create($startDate, $endDate);

        foreach ($period as $date) {
            $dateStr = $date->format('Y-m-d');
            $seconds = $dailyReading[$dateStr] ?? 0;

            // Intensity level (0-4)
            $level = match (true) {
                $seconds === 0 => 0,
                $seconds < 900 => 1,    // < 15 min
                $seconds < 1800 => 2,   // < 30 min
                $seconds < 3600 => 3,   // < 1 hour
                default => 4,           // 1+ hour
            };

            $currentWeek[] = [
                'date' => $dateStr,
                'seconds' => $seconds,
                'level' => $level,
                'formatted' => $this->formatDuration($seconds),
                'dayOfWeek' => $date->dayOfWeek,
            ];

            if ($date->isSunday()) {
                $weeks[] = $currentWeek;
                $currentWeek = [];
            }
        }

        if (!empty($currentWeek)) {
            $weeks[] = $currentWeek;
        }

        return $weeks;
    }

    /**
     * Get reading time per day of week
     */
    protected function getReadingByDayOfWeek(): array
    {
        $userId = Auth::id();
        [$startDate, $endDate] = $this->getDateRange();

        // Get all sessions and group by day of week in PHP (SQLite compatible)
        $sessions = ReadingSession::whereHas('book', fn ($q) => $q->where('user_id', $userId))
            ->whereBetween('started_at', [$startDate, $endDate])
            ->get(['started_at', 'duration_seconds']);

        $data = [];
        foreach ($sessions as $session) {
            $dayOfWeek = $session->started_at->dayOfWeek; // 0 = Sunday, 6 = Saturday
            $data[$dayOfWeek] = ($data[$dayOfWeek] ?? 0) + $session->duration_seconds;
        }

        $days = [
            0 => __('Sun'),
            1 => __('Mon'),
            2 => __('Tue'),
            3 => __('Wed'),
            4 => __('Thu'),
            5 => __('Fri'),
            6 => __('Sat'),
        ];

        $result = [];
        $maxSeconds = !empty($data) ? max($data) : 1;

        foreach ($days as $num => $name) {
            $seconds = $data[$num] ?? 0;
            $result[] = [
                'day' => $name,
                'seconds' => $seconds,
                'hours' => round($seconds / 3600, 1),
                'percentage' => $maxSeconds > 0 ? round(($seconds / $maxSeconds) * 100) : 0,
            ];
        }

        return $result;
    }

    /**
     * Get top books by reading time
     */
    protected function getTopBooks(int $limit = 5): array
    {
        $userId = Auth::id();
        [$startDate, $endDate] = $this->getDateRange();

        return Book::where('user_id', $userId)
            ->where('total_reading_seconds', '>', 0)
            ->orderBy('total_reading_seconds', 'desc')
            ->limit($limit)
            ->get()
            ->map(fn ($book) => [
                'id' => $book->id,
                'title' => $book->title,
                'author' => $book->author,
                'cover_url' => $book->cover_url,
                'progress' => $book->progress,
                'is_finished' => $book->is_finished,
                'reading_time' => $this->formatDuration($book->total_reading_seconds),
                'seconds' => $book->total_reading_seconds,
            ])
            ->toArray();
    }

    /**
     * Get recent reading sessions
     */
    protected function getRecentSessions(int $limit = 10): array
    {
        $userId = Auth::id();

        return ReadingSession::with('book')
            ->whereHas('book', fn ($q) => $q->where('user_id', $userId))
            ->orderBy('started_at', 'desc')
            ->limit($limit)
            ->get()
            ->map(fn ($session) => [
                'book_title' => $session->book->title,
                'book_id' => $session->book_id,
                'duration' => $session->formatted_duration,
                'progress_change' => $session->progress_change,
                'started_at' => $session->started_at->diffForHumans(),
                'client' => $session->client_label,
            ])
            ->toArray();
    }

    /**
     * Get monthly reading trend
     */
    protected function getMonthlyTrend(): array
    {
        $userId = Auth::id();
        $startDate = now()->subMonths(11)->startOfMonth();

        // Get all sessions and group by month in PHP (SQLite compatible)
        $sessions = ReadingSession::whereHas('book', fn ($q) => $q->where('user_id', $userId))
            ->where('started_at', '>=', $startDate)
            ->get(['started_at', 'duration_seconds']);

        $data = [];
        foreach ($sessions as $session) {
            $monthKey = $session->started_at->format('Y-m');
            $data[$monthKey] = ($data[$monthKey] ?? 0) + $session->duration_seconds;
        }

        $result = [];
        $period = CarbonPeriod::create($startDate, '1 month', now());

        foreach ($period as $date) {
            $monthKey = $date->format('Y-m');
            $seconds = $data[$monthKey] ?? 0;
            $result[] = [
                'month' => $date->translatedFormat('M'),
                'year' => $date->format('Y'),
                'seconds' => $seconds,
                'hours' => round($seconds / 3600, 1),
            ];
        }

        return $result;
    }

    protected function formatDuration(int|float $seconds): string
    {
        $seconds = (int) $seconds;

        if ($seconds < 60) {
            return '0m';
        }

        $hours = floor($seconds / 3600);
        $minutes = floor(($seconds % 3600) / 60);

        if ($hours > 0) {
            return "{$hours}h {$minutes}m";
        }

        return "{$minutes}m";
    }

    public function render()
    {
        return view('livewire.reading-dashboard', [
            'stats' => $this->getStats(),
            'activityHeatmap' => $this->getActivityHeatmap(),
            'readingByDay' => $this->getReadingByDayOfWeek(),
            'topBooks' => $this->getTopBooks(),
            'recentSessions' => $this->getRecentSessions(),
            'monthlyTrend' => $this->getMonthlyTrend(),
        ]);
    }
}
