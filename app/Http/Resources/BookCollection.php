<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\ResourceCollection;

class BookCollection extends ResourceCollection
{
    public $collects = BookResource::class;

    public function toArray(Request $request): array
    {
        return [
            'data' => $this->collection,
        ];
    }

    public function with(Request $request): array
    {
        // Force integer values to prevent array corruption from query params
        $currentPage = $this->currentPage();
        $lastPage = $this->lastPage();
        $perPage = $this->perPage();
        $total = $this->total();

        return [
            'meta' => [
                'current_page' => is_array($currentPage) ? (int) $currentPage[0] : (int) $currentPage,
                'last_page' => is_array($lastPage) ? (int) $lastPage[0] : (int) $lastPage,
                'per_page' => is_array($perPage) ? (int) $perPage[0] : (int) $perPage,
                'total' => is_array($total) ? (int) $total[0] : (int) $total,
            ],
        ];
    }
}
