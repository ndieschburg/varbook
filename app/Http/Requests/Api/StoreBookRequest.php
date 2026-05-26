<?php

namespace App\Http\Requests\Api;

use App\Facades\Settings;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

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
            'file' => ['required', 'file', "max:{$maxSize}"],
        ];
    }

    /**
     * Validate that the uploaded file is an EPUB
     *
     * Checks both MIME type and file extension since some EPUB files
     * are detected as application/zip instead of application/epub+zip.
     */
    public function after(): array
    {
        return [
            function (Validator $validator) {
                $file = $this->file('file');
                if (! $file) {
                    return;
                }

                $hasEpubMime = in_array($file->getMimeType(), ['application/epub+zip', 'application/epub']);
                $hasEpubExtension = strtolower($file->getClientOriginalExtension()) === 'epub';

                if (! $hasEpubMime && ! $hasEpubExtension) {
                    $validator->errors()->add('file', __('Only EPUB files are allowed'));
                }
            },
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
