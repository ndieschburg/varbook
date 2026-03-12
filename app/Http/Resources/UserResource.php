<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'is_admin' => $this->is_admin,
            'email_verified' => $this->hasVerifiedEmail(),
            'timezone' => $this->timezone,
            'total_reading_seconds' => $this->total_reading_time,
            'formatted_reading_time' => $this->formatted_reading_time,
            'books_count' => $this->when(isset($this->books_count), $this->books_count),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
