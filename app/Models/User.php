<?php

namespace App\Models;

use App\Notifications\VerifyEmailNotification;
use Carbon\Carbon;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Support\Facades\Hash;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable implements MustVerifyEmail
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'kosync_password_hash',
        'is_admin',
        'timezone',
    ];

    protected $hidden = [
        'password',
        'kosync_password_hash',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_admin' => 'boolean',
        ];
    }

    /**
     * Compute and store the kosync password hash from a plain-text password.
     *
     * KOReader sends md5(password) as the auth key. We store bcrypt(md5(password))
     * so we can verify it with Hash::check() on incoming kosync requests.
     */
    public function setKosyncPasswordHash(string $plainPassword): void
    {
        $this->kosync_password_hash = Hash::make(md5($plainPassword));
    }

    public function books(): HasMany
    {
        return $this->hasMany(Book::class);
    }

    public function isAdmin(): bool
    {
        return $this->is_admin;
    }

    /**
     * Send the email verification notification.
     */
    public function sendEmailVerificationNotification(): void
    {
        $this->notify(new VerifyEmailNotification);
    }

    public function getTotalReadingTimeAttribute(): int
    {
        return $this->books()->sum('total_reading_seconds');
    }

    public function getFormattedReadingTimeAttribute(): string
    {
        $seconds = $this->total_reading_time;
        $hours = floor($seconds / 3600);
        $minutes = floor(($seconds % 3600) / 60);

        if ($hours > 0) {
            return "{$hours}h {$minutes}m";
        }

        return "{$minutes}m";
    }

    /**
     * Convert a datetime to the user's timezone.
     */
    public function toUserTimezone(Carbon|string|null $date): ?Carbon
    {
        if ($date === null) {
            return null;
        }

        if (is_string($date)) {
            $date = Carbon::parse($date);
        }

        return $date->timezone($this->timezone ?? 'Europe/Brussels');
    }

    /**
     * Format a datetime in the user's timezone.
     */
    public function formatDate(Carbon|string|null $date, string $format = 'd/m/Y H:i'): ?string
    {
        $converted = $this->toUserTimezone($date);

        return $converted?->format($format);
    }
}
