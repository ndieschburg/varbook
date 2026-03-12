<?php

namespace App\Http\Requests\Api;

use App\Facades\Settings;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) Settings::get('general.allow_registration');
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:users'],
            'password' => ['required', 'string', 'confirmed', Password::defaults()],
        ];
    }

    protected function failedAuthorization(): void
    {
        abort(403, __('Registration is currently disabled'));
    }
}
