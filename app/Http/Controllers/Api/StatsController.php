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

        // Basic stats
        $totalBooks = Book::where('user_id', $user->id)->count();
        $booksFinished = Book::where('user_id', $user->id)->where('is_finished', true)->count();
        $booksReading = Book::where('user_id', $user->id)
            ->where('progress', '>', 0)
            ->where('is_finished', false)
            ->count();
        $booksNotStarted = $totalBooks - $booksFinished - $booksReading;

        // Reading time
        $totalReadingSeconds = Book::where('user_id', $user->id)->sum('total_reading_seconds');

        // Sessions
        $totalSessions = ReadingSession::whereHas('book', function ($query) use ($user) {
            $query->where('user_id', $user->id);
        })->count();

        // Reading by month (last 12 months)
        $readingByMonth = ReadingSession::whereHas('book', function ($query) use ($user) {
            $query->where('user_id', $user->id);
        })
            ->where('started_at', '>=', now()->subMonths(12))
            ->select(
                DB::raw("DATE_FORMAT(started_at, '%Y-%m') as month"),
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
            $query->where('user_id', $user->id);
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

        // Recent sessions
        $recentSessions = ReadingSession::with('book:id,title,author,cover_url')
            ->whereHas('book', function ($query) use ($user) {
                $query->where('user_id', $user->id);
            })
            ->orderBy('started_at', 'desc')
            ->limit(10)
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

        return response()->json([
            'data' => [
                'total_books' => $totalBooks,
                'books_finished' => $booksFinished,
                'books_reading' => $booksReading,
                'books_not_started' => $booksNotStarted,
                'total_reading_seconds' => $totalReadingSeconds,
                'total_reading_time' => $this->formatDuration($totalReadingSeconds),
                'total_sessions' => $totalSessions,
                'reading_by_month' => $readingByMonth,
                'reading_by_client' => $readingByClient,
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
            'moonreader' => 'Moon+ Reader',
            'koreader' => 'KOReader',
            'web' => 'Web Reader',
            default => ucfirst($client),
        };
    }
}
