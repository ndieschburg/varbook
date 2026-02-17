<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BookSyncIdentifier extends Model
{
    use HasFactory;

    protected $fillable = [
        'book_id',
        'client',
        'external_identifier',
        'last_sync_at',
        'last_progress',
    ];

    protected function casts(): array
    {
        return [
            'last_sync_at' => 'datetime',
            'last_progress' => 'decimal:2',
        ];
    }

    public function book(): BelongsTo
    {
        return $this->belongsTo(Book::class);
    }

    public function updateSync(float $progress): void
    {
        $this->last_sync_at = now();
        $this->last_progress = $progress;
        $this->save();
    }
}
