<?php

namespace App\Http\Requests\Api;

use App\Facades\Settings;
use Illuminate\Foundation\Http\FormRequest;

class StoreBookRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $maxSizeMb = Settings::get('general.max_upload_size_mb') ?? config('bookshelf.max_upload_size_mb', 50);
        $maxSize = $maxSizeMb * 1024; // Convert to KB

        return [
            'file' => ['required', 'file', 'mimes:epub', "max:{$maxSize}"],
        ];
    }

    public function messages(): array
    {
        $maxSizeMb = Settings::get('general.max_upload_size_mb') ?? config('bookshelf.max_upload_size_mb', 50);

        return [
            'file.required' => __('Please select an EPUB file to upload'),
            'file.mimes' => __('Only EPUB files are allowed'),
            'file.max' => __('The file may not be larger than :max MB', ['max' => $maxSizeMb]),
        ];
    }
}
