<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReadingSession extends Model
{
    use HasFactory;

    protected $fillable = [
        'book_id',
        'started_at',
        'ended_at',
        'duration_seconds',
        'progress_before',
        'progress_after',
        'client',
        'raw_payload',
    ];

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'ended_at' => 'datetime',
            'duration_seconds' => 'integer',
            'progress_before' => 'decimal:2',
            'progress_after' => 'decimal:2',
            'raw_payload' => 'array',
        ];
    }

    public function book(): BelongsTo
    {
        return $this->belongsTo(Book::class);
    }

    public function getFormattedDurationAttribute(): string
    {
        $seconds = $this->duration_seconds;
        $hours = floor($seconds / 3600);
        $minutes = floor(($seconds % 3600) / 60);

        if ($hours > 0) {
            return "{$hours}h {$minutes}m";
        }

        return "{$minutes}m";
    }

    public function getProgressChangeAttribute(): string
    {
        return "{$this->progress_before}% → {$this->progress_after}%";
    }

    public function getClientLabelAttribute(): string
    {
        return match ($this->client) {
            'moon' => 'Moon+ Reader',
            'koreader' => 'KOReader',
            'web' => 'Web',
            default => ucfirst($this->client),
        };
    }
}
