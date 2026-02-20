<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProgressRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'progress' => ['required', 'numeric', 'min:0', 'max:100'],
            'position' => ['nullable', 'string', 'max:500'], // EPUB CFI
            'timestamp' => ['nullable', 'date'],
            'client' => ['nullable', 'string', 'in:web,koreader,moon'],
        ];
    }
}
