<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Crypt;

class TokenPairingCode extends Model
{
    protected $fillable = [
        'user_id',
        'api_token_id',
        'code',
        'encrypted_token',
        'expires_at',
        'claimed_at',
    ];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'claimed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function apiToken(): BelongsTo
    {
        return $this->belongsTo(ApiToken::class);
    }

    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    public function isClaimed(): bool
    {
        return $this->claimed_at !== null;
    }

    public function markClaimed(): void
    {
        $this->update(['claimed_at' => now()]);
    }

    /**
     * Get the decrypted plain token.
     */
    public function getPlainToken(): string
    {
        return Crypt::decryptString($this->encrypted_token);
    }

    /**
     * Generate a unique 5-digit code among active (non-expired, non-claimed) codes.
     */
    public static function generateUniqueCode(): string
    {
        do {
            $code = str_pad(random_int(0, 99999), 5, '0', STR_PAD_LEFT);
        } while (
            self::where('code', $code)
                ->whereNull('claimed_at')
                ->where('expires_at', '>', now())
                ->exists()
        );

        return $code;
    }

    /**
     * Find an active (non-expired, non-claimed) pairing code.
     */
    public static function findActiveByCode(string $code): ?self
    {
        return self::where('code', $code)
            ->whereNull('claimed_at')
            ->where('expires_at', '>', now())
            ->first();
    }

    /**
     * Delete expired or claimed codes older than 10 minutes.
     */
    public static function pruneExpired(): int
    {
        return self::where(function ($query) {
            $query->where('expires_at', '<', now())
                ->orWhereNotNull('claimed_at');
        })->where('updated_at', '<', now()->subMinutes(10))
            ->delete();
    }
}
