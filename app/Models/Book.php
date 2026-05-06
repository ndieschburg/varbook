<?php

namespace App\Models;

use App\Facades\Settings;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

class Book extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'title',
        'author',
        'description',
        'language',
        'publisher',
        'isbn',
        'filename',
        'storage_path',
        'cover_path',
        'file_hash',
        'koreader_file_hash',
        'file_size',
        'progress',
        'total_reading_seconds',
        'is_finished',
        'last_read_at',
        'reading_pivot',
    ];

    protected function casts(): array
    {
        return [
            'file_size' => 'integer',
            'progress' => 'decimal:5',
            'total_reading_seconds' => 'integer',
            'is_finished' => 'boolean',
            'last_read_at' => 'datetime',
            'reading_pivot' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function readingSessions(): HasMany
    {
        return $this->hasMany(ReadingSession::class);
    }

    public function syncIdentifiers(): HasMany
    {
        return $this->hasMany(BookSyncIdentifier::class);
    }

    public function getStatusAttribute(): string
    {
        if ($this->is_finished) {
            return 'finished';
        }

        if ($this->progress > 0) {
            return 'reading';
        }

        return 'not_started';
    }

    public function getStatusLabelAttribute(): string
    {
        return match ($this->status) {
            'finished' => 'Finished',
            'reading' => "Reading ({$this->progress}%)",
            default => 'Not started',
        };
    }

    public function getFormattedReadingTimeAttribute(): string
    {
        $seconds = $this->total_reading_seconds;
        $hours = floor($seconds / 3600);
        $minutes = floor(($seconds % 3600) / 60);

        if ($hours > 0) {
            return "{$hours}h {$minutes}m";
        }

        return "{$minutes}m";
    }

    public function getFormattedFileSizeAttribute(): string
    {
        $bytes = $this->file_size;

        if ($bytes >= 1073741824) {
            return number_format($bytes / 1073741824, 2) . ' GB';
        }

        if ($bytes >= 1048576) {
            return number_format($bytes / 1048576, 2) . ' MB';
        }

        if ($bytes >= 1024) {
            return number_format($bytes / 1024, 2) . ' KB';
        }

        return $bytes . ' bytes';
    }

    public function getCoverUrlAttribute(): ?string
    {
        if (!$this->cover_path) {
            return null;
        }

        return Storage::url($this->cover_path);
    }

    public function getDownloadUrlAttribute(): string
    {
        return route('books.download', $this);
    }

    public function recalculateReadingTime(): void
    {
        $this->total_reading_seconds = $this->readingSessions()->sum('duration_seconds');
        $this->save();
    }

    public function markAsFinished(): void
    {
        $this->is_finished = true;
        $this->save();
    }

    /**
     * Update the reading pivot (cross-client position format)
     *
     * @param array{spine_index: int, spine_href: string, spine_percent: float, source: string} $pivot
     */
    public function updatePivot(array $pivot): void
    {
        $this->reading_pivot = [
            'spine_index' => (int) $pivot['spine_index'],
            'spine_href' => $pivot['spine_href'],
            'spine_percent' => $pivot['spine_percent'],
            'source' => $pivot['source'],
            'updated_at' => now()->toIso8601String(),
        ];
        $this->save();
    }

    public function updateProgress(float $progress): void
    {
        $this->progress = min(100, max(0, $progress));

        $finishedThreshold = Settings::get('general.finished_threshold') ?? config('bookshelf.finished_threshold', 95);
        if ($this->progress >= $finishedThreshold) {
            $this->is_finished = true;
        }

        $this->save();
    }
}
