<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BookResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'author' => $this->author,
            'description' => $this->description,
            'language' => $this->language,
            'publisher' => $this->publisher,
            'isbn' => $this->isbn,
            'filename' => $this->filename,
            'file_hash' => $this->file_hash,
            'file_size' => $this->file_size,
            'formatted_file_size' => $this->formatted_file_size,
            'progress' => (float) $this->progress,
            'is_finished' => $this->is_finished,
            'status' => $this->status,
            'status_label' => $this->status_label,
            'total_reading_seconds' => $this->total_reading_seconds,
            'formatted_reading_time' => $this->formatted_reading_time,
            'cover_url' => $this->cover_url,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
