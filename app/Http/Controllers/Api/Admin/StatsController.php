<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Book;
use App\Models\ReadingSession;
use App\Models\User;
use Illuminate\Http\JsonResponse;

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
