<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class ApiToken extends Model
{
    protected $fillable = [
        'user_id',
        'name',
        'token',
        'plain_prefix',
        'last_used_at',
    ];

    protected function casts(): array
    {
        return [
            'last_used_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Generate a new API token for a user.
     *
     * @return array{model: self, plain_token: string}
     */
    public static function generateForUser(User $user, string $name): array
    {
        $plainToken = strtolower(Str::random(16));

        $model = self::create([
            'user_id' => $user->id,
            'name' => $name,
            'token' => hash('sha256', $plainToken),
            'plain_prefix' => substr($plainToken, 0, 4),
        ]);

        return [
            'model' => $model,
            'plain_token' => $plainToken,
        ];
    }

    /**
     * Find a token by its plain-text value.
     */
    public static function findByPlainToken(string $plainToken): ?self
    {
        return self::where('token', hash('sha256', $plainToken))->first();
    }

    /**
     * Mark this token as recently used.
     */
    public function markAsUsed(): void
    {
        $this->update(['last_used_at' => now()]);
    }
}
