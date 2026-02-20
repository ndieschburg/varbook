<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReadingSessionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'book_id' => $this->book_id,
            'started_at' => $this->started_at?->toIso8601String(),
            'ended_at' => $this->ended_at?->toIso8601String(),
            'duration_seconds' => $this->duration_seconds,
            'formatted_duration' => $this->formatted_duration,
            'progress_before' => (float) $this->progress_before,
            'progress_after' => (float) $this->progress_after,
            'progress_change' => $this->progress_change,
            'client' => $this->client,
            'client_label' => $this->client_label,
        ];
    }
}
