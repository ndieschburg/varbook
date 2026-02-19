<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class DownloadToken extends Model
{
    protected $fillable = [
        'user_id',
        'token',
        'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isValid(): bool
    {
        return $this->expires_at->isFuture();
    }

    /**
     * Get or create a valid token for the user.
     * Extends validity if token exists and is still valid.
     */
    public static function getOrCreateForUser(User $user, int $validityHours = 8): self
    {
        $token = self::where('user_id', $user->id)
            ->where('expires_at', '>', now())
            ->first();

        if ($token) {
            // Extend validity
            $token->expires_at = now()->addHours($validityHours);
            $token->save();

            return $token;
        }

        // Create new token
        return self::create([
            'user_id' => $user->id,
            'token' => Str::random(64),
            'expires_at' => now()->addHours($validityHours),
        ]);
    }

    /**
     * Find a valid token by its string value.
     */
    public static function findValidToken(string $token): ?self
    {
        return self::where('token', $token)
            ->where('expires_at', '>', now())
            ->first();
    }

    /**
     * Clean up expired tokens.
     */
    public static function cleanupExpired(): int
    {
        return self::where('expires_at', '<', now())->delete();
    }
}
